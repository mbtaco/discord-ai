const {
  Client,
  GatewayIntentBits,
  ChannelType
} = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { commands } = require('./deploy-commands');
require('dotenv').config();

// Configuration & Initialization
// =============================

// Validate required environment variables
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN is required in .env file');
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is required in .env file');
  process.exit(1);
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Discord client configuration
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// System Prompt & Utilities
// ========================

const getSystemPrompt = () => {
  const currentDate = new Date().toLocaleString('en-US', {
    timeZone: 'UTC',
    dateStyle: 'full',
    timeStyle: 'short'
  });

  return `The current date & time is ${currentDate}

You are a helpful Discord bot powered by Google Gemini AI. The user's message will be prefixed with their username. 

Keep responses under 1000 characters and be helpful, friendly, and engaging.

Use Discord markdown formatting:
**bold text** *italic text* ***bold italic*** __underline__ ~~strikethrough~~
\`inline code\` \`\`\`code blocks\`\`\` > quote text ||spoiler text||
# Headers - bullet points - numbered lists [links](url)`;
};

// The commands array is now imported from deploy-commands.js

// Conversation Management
// ======================

const conversationHistories = new Map();
const MAX_HISTORY_LENGTH = 20;

function makeEmbed({ username, title, description, avatarURL }) {
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

async function sendToGemini(channelId, username, userMessage) {
  if (!conversationHistories.has(channelId)) {
    conversationHistories.set(channelId, []);
  }
  
  const history = conversationHistories.get(channelId);
  const prefixedMessage = `${username}: ${userMessage}`;

  try {
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

    // Update conversation history
    history.push({
      role: 'user',
      parts: [{ text: prefixedMessage }],
    });
    history.push({
      role: 'model',
      parts: [{ text: aiReply }],
    });

    // Maintain history size limit
    if (history.length > MAX_HISTORY_LENGTH) {
      conversationHistories.set(channelId, history.slice(-MAX_HISTORY_LENGTH));
    }

    return aiReply;
  } catch (error) {
    console.error('Gemini AI Error:', error);
    throw new Error('Failed to get AI response');
  }
}

// Discord Event Handlers
// =====================

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);
  console.log(`🤖 Bot is in ${client.guilds.cache.size} servers`);

  // The slash command registration is now handled by deploy-commands.js
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    switch (commandName) {
      case 'ai':
        await handleAICommand(interaction);
        break;
      case 'clear':
        await handleClearCommand(interaction);
        break;
      case 'help':
        await handleHelpCommand(interaction);
        break;
      default:
        await interaction.reply('❌ Unknown command');
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    await handleInteractionError(interaction, error);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Only respond to mentions in channels, not DMs
  const isMentioned = message.mentions?.has(client.user);
  if (!isMentioned) return;

  let userMessage = message.content.replace(`<@${client.user.id}>`, '').trim();
  if (!userMessage) return;

  try {
    message.channel.sendTyping();
    const aiReply = await sendToGemini(message.channel.id, message.author.username, userMessage);

    const embed = makeEmbed({
      username: message.author.username,
      title: userMessage,
      description: aiReply,
      avatarURL: message.author.displayAvatarURL()
    });

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Message handling error:', error);
    await message.reply('❌ Sorry, I encountered an error. Please try again later.');
  }
});

// Command Handlers
// ===============

async function handleAICommand(interaction) {
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
  } catch (error) {
    console.error('AI command error:', error);
    await interaction.editReply('❌ Sorry, I encountered an error while processing your request. Please try again later.');
  }
}

async function handleClearCommand(interaction) {
  const channelId = interaction.channel.id;
  conversationHistories.delete(channelId);
  await interaction.reply('✅ This channel\'s AI conversation history has been cleared!');
}

async function handleHelpCommand(interaction) {
  const helpEmbed = {
    color: 0x4285f4,
    title: '🤖 Discord AI Bot Help',
    description: 'I\'m a Discord bot powered by Google Gemini AI!',
    fields: [
      {
        name: '📝 Commands',
        value: '`/ai <message>` - Chat with AI\n`/clear` - Clear conversation history\n`/help` - Show this help',
        inline: false
      },
      {
        name: '💬 Usage',
        value: '• Use `/ai` followed by your message\n• Mention me in any channel',
        inline: false
      },
      {
        name: '🔧 Features',
        value: '• AI-powered responses\n• Conversation memory per channel\n• Discord markdown support\n• Slash commands',
        inline: false
      }
    ],
    footer: {
      text: 'Powered by Google Gemini 2.5 Flash'
    }
  };

  await interaction.reply({ embeds: [helpEmbed] });
}

async function handleInteractionError(interaction, error) {
  const errorMessage = 'There was an error while executing this command!';
  
  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply(errorMessage);
  } else if (interaction.deferred) {
    await interaction.editReply(errorMessage);
  }
}

// Error Handling & Cleanup
// =======================

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bot...');
  client.destroy();
  process.exit(0);
});

// Bot Login
// =========

client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log('🔐 Logging in...'))
  .catch(err => {
    console.error('❌ Failed to login:', err);
    process.exit(1);
  });