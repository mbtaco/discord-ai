import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const commands = [
  new SlashCommandBuilder()
    .setName("chat")
    .setDescription("Chat with Gemini 2.5 Flash")
    .addStringOption(o =>
      o.setName("message").setDescription("Your message").setRequired(true)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("newchat")
    .setDescription("Start a fresh chat and send a message")
    .addStringOption(o =>
      o.setName("message").setDescription("Your first message").setRequired(true)
    )
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

try {
  console.log(`🚀 Deploying ${commands.length} commands...`);
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
  console.log("✅ Commands deployed!");
} catch (e) {
  console.error("❌ Deploy error:", e);
}