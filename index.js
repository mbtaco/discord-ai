const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

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
        .setName('ping')
        .setDescription('Replies with Pong!'),
    new SlashCommandBuilder()
        .setName('user')
        .setDescription('Provides information about the user.'),
    new SlashCommandBuilder()
        .setName('server')
        .setDescription('Provides information about the server.'),
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

// Store conversation histories per user
const conversationHistories = new Map();

// When the client is ready, run this code
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);
    console.log(`🤖 Bot is in ${client.guilds.cache.size} servers`);

    // Register slash commands (this will overwrite existing commands)
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

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

    const { commandName } = interaction;

    try {
        if (commandName === 'ping') {
            await interaction.reply('🏓 Pong!');
        } 
        
        else if (commandName === 'user') {
            await interaction.reply(`This command was run by ${interaction.user.username}, who joined on ${interaction.member.joinedAt}.`);
        } 
        
        else if (commandName === 'server') {
            await interaction.reply(`This server is ${interaction.guild.name} and has ${interaction.guild.memberCount} members.`);
        }
        
        else if (commandName === 'ai') {
            // Defer reply since AI might take a moment
            await interaction.deferReply();

            const userMessage = interaction.options.getString('message');
            const userId = interaction.user.id;

            // Get or create conversation history for this user
            if (!conversationHistories.has(userId)) {
                conversationHistories.set(userId, []);
            }

            const history = conversationHistories.get(userId);

            try {
                // Create chat session with history
                const chat = model.startChat({
                    history: history,
                    generationConfig: {
                        maxOutputTokens: 1000,
                        temperature: 0.7,
                    },
                });

                // Send message and get response
                const result = await chat.sendMessage(userMessage);
                const response = result.response;
                let aiReply = response.text();

                // Discord has a 2000 character limit for messages
                if (aiReply.length > 2000) {
                    aiReply = aiReply.substring(0, 1997) + '...';
                }

                // Update conversation history
                history.push({
                    role: 'user',
                    parts: [{ text: userMessage }],
                });
                history.push({
                    role: 'model',
                    parts: [{ text: aiReply }],
                });

                // Keep only the last 20 messages to avoid hitting API limits
                if (history.length > 20) {
                    conversationHistories.set(userId, history.slice(-20));
                }

                await interaction.editReply({
                    content: `**${interaction.user.username}:** ${userMessage}\n\n**AI:** ${aiReply}`,
                });

            } catch (aiError) {
                console.error('Gemini AI Error:', aiError);
                await interaction.editReply('❌ Sorry, I encountered an error while processing your request. Please try again later.');
            }
        }
        
        else if (commandName === 'clear') {
            const userId = interaction.user.id;
            conversationHistories.delete(userId);
            await interaction.reply('✅ Your AI conversation history has been cleared!');
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

    const userId = message.author.id;

    // Show typing indicator
    message.channel.sendTyping();

    try {
        // Get or create conversation history for this user
        if (!conversationHistories.has(userId)) {
            conversationHistories.set(userId, []);
        }

        const history = conversationHistories.get(userId);

        // Create chat session with history
        const chat = model.startChat({
            history: history,
            generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.7,
            },
        });

        // Send message and get response
        const result = await chat.sendMessage(userMessage);
        const response = result.response;
        let aiReply = response.text();

        // Discord has a 2000 character limit for messages
        if (aiReply.length > 2000) {
            aiReply = aiReply.substring(0, 1997) + '...';
        }

        // Update conversation history
        history.push({
            role: 'user',
            parts: [{ text: userMessage }],
        });
        history.push({
            role: 'model',
            parts: [{ text: aiReply }],
        });

        // Keep only the last 20 messages to avoid hitting API limits
        if (history.length > 20) {
            conversationHistories.set(userId, history.slice(-20));
        }

        await message.reply(aiReply);

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