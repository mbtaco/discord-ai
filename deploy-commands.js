require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { SlashCommandBuilder } = require('discord.js');
const commands = [
  new SlashCommandBuilder()
    .setName('chat')
    .setDescription('Chat with the AI')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Your message to the AI')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option.setName('new')
        .setDescription('Start a new conversation')
        .setRequired(false)
    )
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Deploying commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Commands registered!');
  } catch (error) {
    console.error(error);
  }
})();
