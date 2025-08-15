const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder
} = require('discord.js');
const {
    GoogleGenerativeAI
} = require('@google/generative-ai');
require('dotenv').config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
});

// System prompt for the AI
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

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Define slash commands
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
].map(command => command.toJSON());

// Store conversation histories per channel
const conversationHistories = new Map();

// When the client is ready, run this code
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);
    console.log(`🤖 Bot is in ${client.guilds.cache.size} servers`);

    // Register slash commands (this will overwrite existing commands)
    const rest = new REST({
        version: '10'
    }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');

        // This will replace ALL existing commands with the ones defined above
        await rest.put(Routes.applicationCommands(client.user.id), {
            body: commands,
        });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
});

// Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const {
        commandName
    } = interaction;

    try {

        if (commandName === 'ai') {
            // Defer reply since AI might take a moment
            await interaction.deferReply();

            const userMessage = interaction.options.getString('message');
            const channelId = interaction.channel.id;
            const username = interaction.user.username;

            // Get or create conversation history for this channel
            if (!conversationHistories.has(channelId)) {
                conversationHistories.set(channelId, []);
            }

            const history = conversationHistories.get(channelId);

            try {
                // Create the message with username prefix
                const prefixedMessage = `${username}: ${userMessage}`;

                // Create chat session with history and system prompt
                const chat = model.startChat({
                    systemInstruction: {
                        parts: [{
                            text: getSystemPrompt()
                        }]
                    }
                    history: history
                });

                // Send message and get response
                const result = await chat.sendMessage(prefixedMessage);
                const response = result.response;
                let aiReply = response.text();

                // Discord embed description limit is 4096 characters
                if (aiReply.length > 4096) {
                    aiReply = aiReply.substring(0, 4093) + '...';
                }

                // Update conversation history
                history.push({
                    role: 'user',
                    parts: [{
                        text: prefixedMessage
                    }],
                });
                history.push({
                    role: 'model',
                    parts: [{
                        text: aiReply
                    }],
                });

                // Keep only the last 20 messages to avoid hitting API limits
                if (history.length > 20) {
                    conversationHistories.set(channelId, history.slice(-20));
                }

                // Create embed response
                const embed = {
                    color: 0x4285f4, // Google blue
                    author: {
                        name: username,
                        iconURL: interaction.user.displayAvatarURL()
                    },
                    title: userMessage,
                    description: aiReply,
                    footer: {
                        text: 'Gemini 2.5 Flash',
                        iconURL: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/google-gemini-icon.png'
                    },
                    timestamp: new Date().toISOString(),
                };

                await interaction.editReply({
                    embeds: [embed]
                });

            } catch (aiError) {
                console.error('Gemini AI Error:', aiError);
                await interaction.editReply('❌ Sorry, I encountered an error while processing your request. Please try again later.');
            }
        } else if (commandName === 'clear') {
            const channelId = interaction.channel.id;
            conversationHistories.delete(channelId);
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

// Handle direct messages to the bot (optional - for more natural chat)
client.on('messageCreate', async (message) => {
    // Only respond to DMs or mentions, ignore other bots
    if (message.author.bot) return;

    const isDM = message.channel.type === 1; // DM channel type
    const isMentioned = message.mentions.has(client.user);

    if (!isDM && !isMentioned) return;

    // Extract message content (remove bot mention if present)
    let userMessage = message.content.replace(`<@${client.user.id}>`, '').trim();
    if (!userMessage) return;

    const channelId = message.channel.id;
    const username = message.author.username;

    // Show typing indicator
    message.channel.sendTyping();

    try {
        // Get or create conversation history for this channel
        if (!conversationHistories.has(channelId)) {
            conversationHistories.set(channelId, []);
        }

        const history = conversationHistories.get(channelId);

        // Create the message with username prefix (only for non-DMs)
        const prefixedMessage = isDM ? userMessage : `${username}: ${userMessage}`;

        // Create chat session with history and system prompt
        const chat = model.startChat({
            history: [{
                    role: 'user',
                    parts: [{
                        text: getSystemPrompt()
                    }],
                },
                {
                    role: 'model',
                    parts: [{
                        text: 'Understood! I\'m ready to help as a Discord bot. I\'ll keep responses under 1000 characters and use Discord markdown formatting.'
                    }],
                },
                ...history
            ],
            generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.7,
            },
        });

        // Send message and get response
        const result = await chat.sendMessage(prefixedMessage);
        const response = result.response;
        let aiReply = response.text();

        // Discord embed description limit is 4096 characters
        if (aiReply.length > 4096) {
            aiReply = aiReply.substring(0, 4093) + '...';
        }

        // Update conversation history
        history.push({
            role: 'user',
            parts: [{
                text: prefixedMessage
            }],
        });
        history.push({
            role: 'model',
            parts: [{
                text: aiReply
            }],
        });

        // Keep only the last 20 messages to avoid hitting API limits
        if (history.length > 20) {
            conversationHistories.set(channelId, history.slice(-20));
        }

        // Create embed response
        const embed = {
            color: 0x4285f4, // Google blue
            author: {
                name: username,
                iconURL: message.author.displayAvatarURL()
            },
            title: userMessage,
            description: aiReply,
            footer: {
                text: 'Gemini 2.5 Flash',
                iconURL: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/google-gemini-icon.png'
            },
            timestamp: new Date().toISOString(),
        };

        await message.reply({
            embeds: [embed]
        });

    } catch (aiError) {
        console.error('Gemini AI Error:', aiError);
        await message.reply('❌ Sorry, I encountered an error while processing your request. Please try again later.');
    }
});

// Error handling
client.on('error', (error) => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);