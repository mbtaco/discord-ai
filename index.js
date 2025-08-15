const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

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
].map(command => command.toJSON());

// When the client is ready, run this code
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);
    console.log(`🤖 Bot is in ${client.guilds.cache.size} servers`);

    // Register slash commands
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');

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
        } else if (commandName === 'user') {
            await interaction.reply(`This command was run by ${interaction.user.username}, who joined on ${interaction.member.joinedAt}.`);
        } else if (commandName === 'server') {
            await interaction.reply(`This server is ${interaction.guild.name} and has ${interaction.guild.memberCount} members.`);
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        if (!interaction.replied) {
            await interaction.reply('There was an error while executing this command!');
        }
    }
});

// Message handler for prefix commands
client.on('messageCreate', (message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Simple ping command
    if (message.content.toLowerCase() === '!ping') {
        message.reply('🏓 Pong!');
    }

    // Hello command
    if (message.content.toLowerCase() === '!hello') {
        message.reply(`👋 Hello, ${message.author.username}!`);
    }

    // Server info command
    if (message.content.toLowerCase() === '!serverinfo') {
        const embed = {
            color: 0x0099ff,
            title: 'Server Information',
            fields: [
                {
                    name: 'Server Name',
                    value: message.guild.name,
                    inline: true,
                },
                {
                    name: 'Member Count',
                    value: message.guild.memberCount.toString(),
                    inline: true,
                },
                {
                    name: 'Created',
                    value: message.guild.createdAt.toDateString(),
                    inline: true,
                },
            ],
        };
        message.reply({ embeds: [embed] });
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