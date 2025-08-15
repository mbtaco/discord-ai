const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType
} = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// --- Initialize Gemini AI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- System prompt ---
const getSystemPrompt = () => {
  const currentDate = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'full', timeStyle: 'short' });
  return `The current date & time is ${currentDate}

You are a Discord bot. The user's message will be prefixed with their username. 

Keep response under 1000 characters

Use Discord markdown:
**bold text**
*italic text*
***bold italic***
__underline__
~~strikethrough~~
\`inline code\`
\`\`\`code blocks\`\`\`
> quote text
||spoiler text||
# Header 1
## Header 2
### Header 3
[link text](url)
- bullet points
1. numbered lists`;
};

// --- In-memory conversation storage ---
const conversationHistories = new Map();

// --- Helper: create embed object ---
function makeEmbed({ username, title, description, avatarURL }) {
  let desc = description ?? '';
  if (desc.length > 4096) desc = desc.substring(0, 4093) + '...';
  return {
    color: 0x4285f4,
    author: { name: username, iconURL: avatarURL },
    title: title ?? '',
    description: desc,
    footer: {
      text: 'Gemini 2.5 Flash',
      iconURL: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/google-gemini-icon.png'
    },
    timestamp: new Date().toISOString()
  };
}

// --- Helper: send message to Gemini ---
async function sendToGemini(channelId, username, userMessage) {
  if (!conversationHistories.has(channelId)) conversationHistories.set(channelId, []);
  const history = conversationHistories.get(channelId);
  const prefixedMessage = `${username}: ${userMessage}`;

  const chat = model.startChat({
    systemInstruction: { parts: [{ text: getSystemPrompt() }] },
    history,
    generationConfig: { maxOutputTokens: 1000, temperature: 0.7 },
  });

  const result = await chat.sendMessage(prefixedMessage);
  const aiReply = result.response?.text?.() ?? '';

  history.push({ role: 'user', parts: [{ text: prefixedMessage }] });
  history.push({ role: 'model', parts: [{ text: aiReply }] });

  if (history.length > 20) conversationHistories.set(channelId, history.slice(-20));

  return aiReply;
}

// --- Discord client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// --- Slash commands ---
const commands = [
  new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Chat with Gemini AI')
    .setDMPermission(true)
    .addStringOption(opt => opt.setName('message').setDescription('Your message').setRequired(true)),
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear your AI conversation history')
    .setDMPermission(true)
].map(cmd => cmd.toJSON());

// --- Register slash commands ---
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('Registering slash commands...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Slash commands registered successfully.');
  } catch (err) {
    console.error('Error registering slash commands:', err);
  }
});

// --- Interaction handler ---
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  const channelId = interaction.channel.id;
  const username = interaction.user.username;

  try {
    if (commandName === 'ai') {
      await interaction.deferReply();
      const userMessage = interaction.options.getString('message', true);
      const aiReply = await sendToGemini(channelId, username, userMessage);

      await interaction.editReply({ embeds: [makeEmbed({
        username,
        title: userMessage,
        description: aiReply,
        avatarURL: interaction.user.displayAvatarURL()
      })] });
    } else if (commandName === 'clear') {
      conversationHistories.delete(channelId);
      await interaction.reply('✅ This channel\'s AI conversation history has been cleared!');
    }
  } catch (err) {
    console.error('Slash command error:', err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply('❌ Error processing your request.');
    } else {
      await interaction.reply('❌ Error processing your request.');
    }
  }
});

// --- Message handler (server mentions only) ---
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const isServer = message.channel.type !== ChannelType.DM;
  const isMentioned = message.mentions.has(client.user);
  if (!isServer || !isMentioned) return;

  const userMessage = message.content.replace(`<@${client.user.id}>`, '').trim();
  if (!userMessage) return;

  try {
    message.channel.sendTyping();
    const aiReply = await sendToGemini(message.channel.id, message.author.username, userMessage);

    await message.reply({ embeds: [makeEmbed({
      username: message.author.username,
      title: userMessage,
      description: aiReply,
      avatarURL: message.author.displayAvatarURL()
    })] });
  } catch (err) {
    console.error('Mention reply error:', err);
    await message.reply('❌ Could not process your message.');
  }
});

// --- Errors ---
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// --- Login ---
client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log('Bot logging in...'))
  .catch(err => console.error('Failed to login:', err));