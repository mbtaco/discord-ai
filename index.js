// bot.js
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
  const currentDate = new Date().toLocaleString('en-US', {
    timeZone: 'UTC',
    dateStyle: 'full',
    timeStyle: 'short'
  });

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

// --- Discord client & commands ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const commands = [
  new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Chat with Gemini AI')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Your message to the AI')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear your AI conversation history'),
].map(cmd => cmd.toJSON());

// --- In-memory conversation storage (per-channel) ---
const conversationHistories = new Map();

// --- Helper: create embed object ---
function makeEmbed({ username, title, description, avatarURL }) {
  // Ensure embed description length fits Discord limits
  let desc = description ?? '';
  if (desc.length > 4096) {
    desc = desc.substring(0, 4093) + '...';
  }

  return {
    color: 0x4285f4,
    author: {
      name: username,
      iconURL: avatarURL
    },
    title: title ?? '',
    description: desc,
    footer: {
      text: 'Gemini 2.5 Flash',
      iconURL: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/google-gemini-icon.png'
    },
    timestamp: new Date().toISOString()
  };
}

// --- Helper: send message to Gemini and update history ---
async function sendToGemini(channelId, username, userMessage) {
  if (!conversationHistories.has(channelId)) {
    conversationHistories.set(channelId, []);
  }
  const history = conversationHistories.get(channelId);

  // Prefix the user's message with their username (as you wanted)
  const prefixedMessage = `${username}: ${userMessage}`;

  // Start chat with systemInstruction and the conversation history
  const chat = model.startChat({
    systemInstruction: { parts: [{ text: getSystemPrompt() }] },
    history: history,
    generationConfig: {
      maxOutputTokens: 1000,
      temperature: 0.7,
    },
  });

  const result = await chat.sendMessage(prefixedMessage);
  const aiReply = result.response?.text?.() ?? '';

  // Update history (user + model)
  history.push({
    role: 'user',
    parts: [{ text: prefixedMessage }],
  });
  history.push({
    role: 'model',
    parts: [{ text: aiReply }],
  });

  // Keep only the last 20 messages to avoid huge histories
  if (history.length > 20) {
    conversationHistories.set(channelId, history.slice(-20));
  }

  return aiReply;
}

// --- Ready: register commands ---
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);
  console.log(`🤖 Bot is in ${client.guilds.cache.size} servers`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Started refreshing application (/) commands.');

    // Replace global application commands (you can change this to guild-specific if you prefer)
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands,
    });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
});

// --- Interaction handler (slash commands) ---
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    if (commandName === 'ai') {
      // Defer reply because the AI call may take a moment
      await interaction.deferReply();

      const userMessage = interaction.options.getString('message', true);
      const channelId = interaction.channel.id;
      const username = interaction.user.username;

      try {
        const aiReply = await sendToGemini(channelId, username, userMessage);

        const embed = makeEmbed({
          username,
          title: userMessage,
          description: aiReply,
          avatarURL: interaction.user.displayAvatarURL()
        });

        await interaction.editReply({ embeds: [embed] });
      } catch (aiError) {
        console.error('Gemini AI Error:', aiError);
        await interaction.editReply('❌ Sorry, I encountered an error while processing your request. Please try again later.');
      }
    } else if (commandName === 'clear') {
      const channelId = interaction.channel.id;
      conversationHistories.delete(channelId);
      // clear is quick; reply normally
      await interaction.reply('✅ This channel\'s AI conversation history has been cleared!');
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply('There was an error while executing this command!');
    } else if (interaction.deferred) {
      await interaction.editReply('There was an error while executing this command!');
    }
  }
});

// --- Message handler for DMs and mentions ---
client.on('messageCreate', async (message) => {
  // ignore bots
  if (message.author.bot) return;

  const isDM = message.channel.type === ChannelType.DM;
  const isMentioned = message.mentions && message.mentions.has && message.mentions.has(client.user);

  if (!isDM && !isMentioned) return;

  // Remove bot mention from content if present
  let userMessage = message.content.replace(`<@${client.user.id}>`, '').trim();
  if (!userMessage) return;

  const channelId = message.channel.id;
  const username = message.author.username;

  try {
    // show typing indicator
    message.channel.sendTyping();

    const aiReply = await sendToGemini(channelId, isDM ? username : username, userMessage);

    const embed = makeEmbed({
      username,
      title: userMessage,
      description: aiReply,
      avatarURL: message.author.displayAvatarURL()
    });

    await message.reply({ embeds: [embed] });
  } catch (aiError) {
    console.error('Gemini AI Error:', aiError);
    try {
      await message.reply('❌ Sorry, I encountered an error while processing your request. Please try again later.');
    } catch (err) {
      console.error('Failed to send error reply:', err);
    }
  }
});

// --- Error handling ---
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// --- Login ---
client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log('Logging in...'))
  .catch(err => console.error('Failed to login:', err));