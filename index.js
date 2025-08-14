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
    await db.connect();

    // Drop table if it exists
    await db.query(`DROP TABLE IF EXISTS messages`);
    console.log('✅ Old messages table dropped');

    // Create new table with proper schema
    await db.query(`
      CREATE TABLE messages (
        message_id BIGINT PRIMARY KEY,
        server_id BIGINT NOT NULL,
        channel_id BIGINT NOT NULL,
        author_id BIGINT NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL
      )
    `);
    console.log('✅ New messages table created with server_id, BIGINTs, and primary key');

    await db.end();
  } catch (err) {
    console.error('❌ Error setting up messages table:', err.message);
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
