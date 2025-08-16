const {
  Client,
  GatewayIntentBits,
  ChannelType
} = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { commands } = require('./deploy-commands');
const {
  initializeDatabase,
  storeMessage,
  updateMessage,
  deleteMessage,
  upsertServer,
  upsertChannel,
  upsertUser,
  generateEmbedding,
  findSimilarMessages,
  getServerContext,
  setUserOptOut
} = require('./database');
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
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

// System Prompt & Utilities
// ========================

const getSystemPrompt = (serverContext = null, relevantMessages = []) => {
  const currentDate = new Date().toLocaleString('en-US', {
    timeZone: 'UTC',
    dateStyle: 'full',
    timeStyle: 'short'
  });

  let systemPrompt = `The current date & time is ${currentDate}

You are a helpful Discord bot powered by Google Gemini AI with access to server context and message history. The user's message will be prefixed with their username.

Keep responses under 1000 characters and be helpful, friendly, and engaging.

Use Discord markdown formatting:
**bold text** *italic text* ***bold italic*** __underline__ ~~strikethrough~~
\`inline code\` \`\`\`code blocks\`\`\` > quote text ||spoiler text||
# Headers - bullet points - numbered lists [links](url)`;

  // Add server context if available
  if (serverContext) {
    systemPrompt += `

## Server Context:
**Server**: ${serverContext.server?.name || 'Unknown'} (${serverContext.server?.member_count || 0} members)
**Channels**: ${serverContext.channels.map(c => `#${c.name}`).join(', ')}
**Recent Active Users**: ${serverContext.recentUsers.map(u => u.display_name || u.username).slice(0, 10).join(', ')}`;
  }

  // Add relevant message context if available
  if (relevantMessages && relevantMessages.length > 0) {
    const isVectorSearch = relevantMessages.some(msg => msg.similarity > 0.5);
    const contextType = isVectorSearch ? "Relevant Previous Messages (Vector Search)" : "Recent Messages";
    
    systemPrompt += `

## ${contextType}:
${relevantMessages.map(msg => 
  `**${msg.display_name || msg.username}** in #${msg.channel_name}: ${msg.content.substring(0, 150)}${msg.content.length > 150 ? '...' : ''}`
).join('\n')}

Use this context to provide more informed and relevant responses.`;
  }

  return systemPrompt;
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

async function sendToGemini(channelId, serverId, username, userMessage) {
  if (!conversationHistories.has(channelId)) {
    conversationHistories.set(channelId, []);
  }
  
  const history = conversationHistories.get(channelId);
  const prefixedMessage = `${username}: ${userMessage}`;

  try {
    // Get server context
    const serverContext = await getServerContext(serverId);
    
    // Generate embedding for the user's message and find similar messages
    const queryEmbedding = await generateEmbedding(userMessage);
    const relevantMessages = queryEmbedding 
      ? await findSimilarMessages(queryEmbedding, serverId, null, 5)
      : [];

    const chat = model.startChat({
      systemInstruction: { parts: [{ text: getSystemPrompt(serverContext, relevantMessages) }] },
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

  // Initialize database
  try {
    await initializeDatabase();
    console.log('🗄️ Database connection established');

    // Sync server and channel data
    for (const guild of client.guilds.cache.values()) {
      await syncServerData(guild);
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }

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
      case 'privacy':
        await handlePrivacyCommand(interaction);
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
  // Skip bot messages
  if (message.author.bot) return;
  
  // Skip DMs (no guild)
  if (!message.guild) return;

  try {
    // Store all non-bot messages in database
    await storeMessageInDB(message);

    // Only respond to mentions
    const isMentioned = message.mentions?.has(client.user);
    if (!isMentioned) return;

    let userMessage = message.content.replace(`<@${client.user.id}>`, '').trim();
    if (!userMessage) return;

    message.channel.sendTyping();
    const aiReply = await sendToGemini(message.channel.id, message.guild.id, message.author.username, userMessage);

    const embed = makeEmbed({
      username: message.author.username,
      title: userMessage,
      description: aiReply,
      avatarURL: message.author.displayAvatarURL()
    });

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Message handling error:', error);
    if (message.mentions?.has(client.user)) {
      await message.reply('❌ Sorry, I encountered an error. Please try again later.');
    }
  }
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (newMessage.author?.bot) return;
  if (!newMessage.guild) return;

  try {
    await updateMessage(newMessage.id, newMessage.content);
  } catch (error) {
    console.error('Message update error:', error);
  }
});

client.on('messageDelete', async (message) => {
  if (message.author?.bot) return;
  if (!message.guild) return;

  try {
    await deleteMessage(message.id);
  } catch (error) {
    console.error('Message delete error:', error);
  }
});

client.on('guildCreate', async (guild) => {
  try {
    await syncServerData(guild);
    console.log(`✅ Joined new server: ${guild.name}`);
  } catch (error) {
    console.error('Error syncing new server data:', error);
  }
});

client.on('channelCreate', async (channel) => {
  if (!channel.guild) return;
  
  try {
    await syncChannelData(channel);
  } catch (error) {
    console.error('Error syncing new channel data:', error);
  }
});

client.on('channelUpdate', async (oldChannel, newChannel) => {
  if (!newChannel.guild) return;
  
  try {
    await syncChannelData(newChannel);
  } catch (error) {
    console.error('Error syncing updated channel data:', error);
  }
});

// Helper Functions
// ===============

async function storeMessageInDB(message) {
  try {
    // Ensure user data is synced
    await upsertUser({
      id: message.author.id,
      username: message.author.username,
      displayName: message.author.displayName,
      avatarUrl: message.author.displayAvatarURL()
    });

    // Ensure channel data is synced
    await syncChannelData(message.channel);

    // Store the message
    await storeMessage({
      id: message.id,
      serverId: message.guild.id,
      channelId: message.channel.id,
      userId: message.author.id,
      content: message.content,
      messageType: message.type === 0 ? 'normal' : 'system',
      replyTo: message.reference?.messageId || null
    });
  } catch (error) {
    console.error('Error storing message in database:', error);
  }
}

async function syncServerData(guild) {
  try {
    // Sync server info
    await upsertServer({
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount
    });

    // Sync all channels
    for (const channel of guild.channels.cache.values()) {
      await syncChannelData(channel);
    }

    console.log(`🔄 Synced server data for: ${guild.name}`);
  } catch (error) {
    console.error(`Error syncing server data for ${guild.name}:`, error);
  }
}

async function syncChannelData(channel) {
  try {
    if (channel.type === ChannelType.GuildText || 
        channel.type === ChannelType.GuildNews || 
        channel.type === ChannelType.GuildVoice ||
        channel.type === ChannelType.GuildCategory) {
      
      await upsertChannel({
        id: channel.id,
        serverId: channel.guild.id,
        name: channel.name,
        type: channel.type,
        topic: channel.topic || null
      });
    }
  } catch (error) {
    console.error(`Error syncing channel data for ${channel.name}:`, error);
  }
}

// Command Handlers
// ===============

async function handleAICommand(interaction) {
  await interaction.deferReply();

  const userMessage = interaction.options.getString('message', true);
  const channelId = interaction.channel.id;
  const serverId = interaction.guild?.id;
  const username = interaction.user.username;

  try {
    const aiReply = await sendToGemini(channelId, serverId, username, userMessage);

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
    description: 'I\'m a Discord bot powered by Google Gemini AI with server context awareness!',
    fields: [
      {
        name: '📝 Commands',
        value: '`/ai <message>` - Chat with AI\n`/clear` - Clear conversation history\n`/privacy <action>` - Manage data privacy\n`/help` - Show this help',
        inline: false
      },
      {
        name: '💬 Usage',
        value: '• Use `/ai` followed by your message\n• Mention me in any channel\n• I remember server context and history',
        inline: false
      },
      {
        name: '🔧 Features',
        value: '• AI with server context awareness\n• Vector similarity search\n• Message history analysis\n• Privacy controls\n• Conversation memory per channel',
        inline: false
      },
      {
        name: '🔒 Privacy',
        value: '• Use `/privacy opt-out` to exclude your messages\n• Use `/privacy opt-in` to re-enable data collection\n• Use `/privacy status` to check your current setting',
        inline: false
      }
    ],
    footer: {
      text: 'Powered by Google Gemini 2.5 Flash + Vector Search'
    }
  };

  await interaction.reply({ embeds: [helpEmbed] });
}

async function handlePrivacyCommand(interaction) {
  const action = interaction.options.getString('action', true);
  const userId = interaction.user.id;

  try {
    switch (action) {
      case 'opt-out':
        await setUserOptOut(userId, true);
        await interaction.reply({
          embeds: [{
            color: 0x10b981,
            title: '✅ Privacy Setting Updated',
            description: 'You have been opted out of message collection. Your existing messages have been marked as deleted and new messages will not be stored.',
            footer: { text: 'Use /privacy opt-in to re-enable data collection' }
          }]
        });
        break;

      case 'opt-in':
        await setUserOptOut(userId, false);
        await interaction.reply({
          embeds: [{
            color: 0x3b82f6,
            title: '✅ Privacy Setting Updated',
            description: 'You have opted back into message collection. Your future messages will be stored to improve AI responses.',
            footer: { text: 'Use /privacy opt-out to disable data collection' }
          }]
        });
        break;

      case 'status':
        const userResult = await setUserOptOut(userId, false); // This just ensures user exists
        const isOptedOut = userResult?.opt_out || false;
        
        await interaction.reply({
          embeds: [{
            color: isOptedOut ? 0xef4444 : 0x10b981,
            title: '🔒 Your Privacy Status',
            description: `**Data Collection**: ${isOptedOut ? '❌ Opted Out' : '✅ Enabled'}`,
            fields: [
              {
                name: 'What this means:',
                value: isOptedOut 
                  ? 'Your messages are not being stored or used for AI context.'
                  : 'Your messages are stored and used to provide better AI responses.',
                inline: false
              }
            ],
            footer: { text: `Use /privacy ${isOptedOut ? 'opt-in' : 'opt-out'} to change this setting` }
          }]
        });
        break;

      default:
        await interaction.reply('❌ Invalid privacy action');
    }
  } catch (error) {
    console.error('Privacy command error:', error);
    await interaction.reply('❌ Sorry, I encountered an error while updating your privacy settings. Please try again later.');
  }
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