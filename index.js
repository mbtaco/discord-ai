const { Client, GatewayIntentBits, Collection } = require('discord.js');
require('dotenv').config();

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// When the client is ready, run this code
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);
    console.log(`🤖 Bot is in ${client.guilds.cache.size} servers`);
});

// Message handler
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