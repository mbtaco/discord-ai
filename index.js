const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
    new SlashCommandBuilder().setName('user').setDescription('Provides information about the user.'),
    new SlashCommandBuilder().setName('server').setDescription('Provides information about the server.'),
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log('Bot is ready!');
    
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Commands registered!');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong!');
    } else if (interaction.commandName === 'user') {
        await interaction.reply(`Hello ${interaction.user.username}!`);
    } else if (interaction.commandName === 'server') {
        await interaction.reply(`Server: ${interaction.guild.name}`);
    }
});

client.login(process.env.DISCORD_TOKEN);