import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Client, Collection, GatewayIntentBits, Events } from "discord.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

// Load command executors (no SlashCommandBuilder here)
const commandsDir = path.join(__dirname, "commands");
const files = fs.readdirSync(commandsDir).filter(f => f.endsWith(".js"));

for (const f of files) {
  const mod = (await import(path.join(commandsDir, f))).default;
  if (mod?.name && typeof mod.execute === "function") {
    client.commands.set(mod.name, mod);
  } else {
    console.warn(`Skipping ${f}: missing name/execute export`);
  }
}

client.once(Events.ClientReady, c => {
  console.log(`✅ Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  try {
    await cmd.execute(interaction);
  } catch (err) {
    console.error(err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply("⚠️ There was an error executing that command.");
    } else {
      await interaction.reply({ content: "⚠️ There was an error executing that command.", ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);