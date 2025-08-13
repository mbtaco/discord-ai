import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import pg from 'pg';
import OpenAI from 'openai';

const { Client: PGClient } = pg;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// PostgreSQL setup
const db = new PGClient({ connectionString: process.env.DATABASE_URL });
await db.connect();

// Conversation memory and cooldowns
const conversationHistory = new Map(); // userId => [{role, content}]
const cooldowns = new Map(); // userId => timestamp

// Gemini / OpenAI clients
const parsingAI = new OpenAI({ apiKey: process.env.GEMINI_API_KEY }); // 2.5 Flash Lite
const finalAI = new OpenAI({ apiKey: process.env.GEMINI_API_KEY }); // 2.5 Pro

// Register slash commands
const commands = [
  new SlashCommandBuilder().setName('ask').setDescription('Ask a question with conversation memory')
    .addStringOption(option => option.setName('question').setDescription('Your question').setRequired(true)),
  new SlashCommandBuilder().setName('asknew').setDescription('Ask a question starting fresh')
    .addStringOption(option => option.setName('question').setDescription('Your question').setRequired(true))
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });

// Cooldown check
function checkCooldown(userId) {
  const last = cooldowns.get(userId) || 0;
  const now = Date.now();
  if (now - last < 10000) return false; // 10 sec
  cooldowns.set(userId, now);
  return true;
}

// Database helper: fetch top relevant messages using embeddings
async function fetchRelevantMessages(questionEmbedding, limit = 10, timestampFilter = null) {
  let query = 'SELECT content, user_id, channel_id, timestamp FROM messages';
  const values = [];

  if (timestampFilter) {
    query += ' WHERE timestamp >= $1';
    values.push(timestampFilter);
  }

  query += ' ORDER BY embedding <-> $' + (values.length + 1) + ' LIMIT $' + (values.length + 2);
  values.push(questionEmbedding, limit);

  const res = await db.query(query, values);
  return res.rows;
}

// Include surrounding messages for context
async function getSurroundingMessages(message, window = 3) {
  const resBefore = await db.query(
    `SELECT content, user_id, channel_id, timestamp FROM messages
     WHERE channel_id=$1 AND timestamp < $2
     ORDER BY timestamp DESC LIMIT $3`,
    [message.channel_id, message.timestamp, window]
  );
  const resAfter = await db.query(
    `SELECT content, user_id, channel_id, timestamp FROM messages
     WHERE channel_id=$1 AND timestamp > $2
     ORDER BY timestamp ASC LIMIT $3`,
    [message.channel_id, message.timestamp, window]
  );
  return [...resBefore.rows.reverse(), message, ...resAfter.rows];
}

// Build Gemini prompt
function buildPrompt(history, relevantMessages, userMessage) {
  const context = relevantMessages.map(m => `[${m.timestamp}] <@${m.user_id}>: ${m.content}`).join('\n');
  const historyText = history.map(h => `${h.role === 'user' ? 'User' : 'AI'}: ${h.content}`).join('\n');

  return `You are an AI assistant. Use only the following Discord messages as context:\n\n${context}\n\nPrevious conversation:\n${historyText}\n\nUser question: ${userMessage}`;
}

// Handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;
  if (!checkCooldown(userId)) {
    await interaction.reply({ content: 'Please wait 10 seconds before asking again.', ephemeral: true });
    return;
  }

  let history = conversationHistory.get(userId) || [];

  const command = interaction.commandName;
  const userMessage = interaction.options.getString('question');

  if (command === 'asknew') {
    history = [];
    conversationHistory.set(userId, history);
  }

  await interaction.deferReply();

  // Step 1: Extract timestamps using Gemini 2.5 Flash Lite
  const parsed = await parsingAI.responses.create({
    model: 'gemini-2.5-flash-lite',
    input: `Extract any dates or timestamps from this message: "${userMessage}"`
  });
  const timestampFilter = parsed.output_text ? new Date(parsed.output_text) : null;

  // Step 2: Embed question and fetch relevant messages
  const embeddingRes = await parsingAI.embeddings.create({
    model: 'gemini-embedding-001',
    input: userMessage
  });
  const questionEmbedding = embeddingRes.data[0].embedding;

  let relevantMessages = await fetchRelevantMessages(questionEmbedding, 10, timestampFilter);

  // Include surrounding messages for context
  let fullContext = [];
  for (const msg of relevantMessages) {
    const surrounding = await getSurroundingMessages(msg, 3);
    fullContext.push(...surrounding);
  }
  // Remove duplicates
  fullContext = Array.from(new Set(fullContext.map(m => m.timestamp + m.user_id + m.content)))
    .map(k => fullContext.find(m => (m.timestamp + m.user_id + m.content) === k));

  // Step 3: Generate answer with Gemini 2.5 Pro
  const prompt = buildPrompt(history, fullContext, userMessage);
  const answerRes = await finalAI.responses.create({
    model: 'gemini-2.5-pro',
    input: prompt
  });
  const answer = answerRes.output_text;

  // Step 4: Store Q&A in conversation memory
  conversationHistory.set(userId, [...history, { role: 'user', content: userMessage }, { role: 'assistant', content: answer }]);

  await interaction.editReply(answer);
});

// Message events to populate DB
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  const embeddingRes = await parsingAI.embeddings.create({ model: 'gemini-embedding-001', input: message.content });
  const embedding = embeddingRes.data[0].embedding;

  await db.query(
    `INSERT INTO messages (message_id, channel_id, user_id, content, timestamp, embedding)
     VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (message_id) DO NOTHING`,
    [message.id, message.channel.id, message.author.id, message.content, message.createdAt, embedding]
  );
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (!newMessage.author || newMessage.author.bot) return;
  const embeddingRes = await parsingAI.embeddings.create({ model: 'gemini-embedding-001', input: newMessage.content });
  const embedding = embeddingRes.data[0].embedding;

  await db.query(
    `UPDATE messages SET content=$1, embedding=$2, timestamp=$3 WHERE message_id=$4`,
    [newMessage.content, embedding, newMessage.editedAt || newMessage.createdAt, newMessage.id]
  );
});

client.on('messageDelete', async (message) => {
  if (!message.id) return;
  await db.query(`DELETE FROM messages WHERE message_id=$1`, [message.id]);
});

client.on('messageDeleteBulk', async (messages) => {
  const ids = messages.map(m => m.id).filter(Boolean);
  if (!ids.length) return;
  const placeholders = ids.map((_, i) => `$${i+1}`).join(',');
  await db.query(`DELETE FROM messages WHERE message_id IN (${placeholders})`, ids);
});

client.login(process.env.DISCORD_TOKEN);
