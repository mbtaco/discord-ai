require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { TextServiceClient } = require('@google-ai/generativelanguage');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Gemini 2.5 Flash client
const gemini = new TextServiceClient({ apiKey: process.env.GEMINI_API_KEY });

// In-memory conversation memory: key = guildId-channelId-userId
const conversations = {};

// Load commands
const fs = require('fs');
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

// Handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (command) {
    try {
      await command.execute(interaction, gemini, conversations);
    } catch (error) {
      console.error('Error executing command:', error);
      await interaction.reply({ content: '❌ Error executing command!', ephemeral: true });
    }
  }
});

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
