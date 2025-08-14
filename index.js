require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Client: PgClient } = require('pg');
const fs = require('fs');

// Connect to PostgreSQL
const db = new PgClient({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

db.connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch(err => console.error('❌ PostgreSQL connection error:', err));

(async () => {
  try {
    await pool.query(`
      ALTER TABLE messages
      ADD CONSTRAINT unique_message_id UNIQUE (message_id);
    `);
    console.log("✅ Unique constraint added to messages.message_id");
  } catch (err) {
    console.error("⚠️ Could not add unique constraint:", err.message);
  }
})();
// Setup Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Load commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

// Handle interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (command) {
    try {
      await command.execute(interaction, db);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'There was an error executing the command!', ephemeral: true });
    }
  }
});

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
