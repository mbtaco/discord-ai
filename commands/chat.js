const { SlashCommandBuilder } = require("discord.js");
const { GoogleGenerativeAI } = require("@google/genai");
const { getSession, clearSession } = require("../sessions");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function runChat(interaction, reset = false) {
  const userId = interaction.user.id;
  const session = getSession(userId);

  if (reset) {
    clearSession(userId);
  }

  const userMessage = interaction.options.getString("message");

  // Add user's message to session
  session.push({ role: "user", parts: [{ text: userMessage }] });

  try {
    const chat = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }).startChat({
      history: session
    });

    const result = await chat.sendMessage(userMessage);
    const botReply = result.response.text();

    // Add bot's reply to session
    session.push({ role: "model", parts: [{ text: botReply }] });

    await interaction.reply(botReply);
  } catch (err) {
    console.error("Gemini API error:", err);
    await interaction.reply("❌ There was an error with the Gemini API.");
  }
}

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName("chat")
      .setDescription("Chat with Gemini")
      .addStringOption(opt =>
        opt.setName("message").setDescription("Your message").setRequired(true)
      ),
    async execute(interaction) {
      await runChat(interaction, false);
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("newchat")
      .setDescription("Start a new chat with Gemini")
      .addStringOption(opt =>
        opt.setName("message").setDescription("Your message").setRequired(true)
      ),
    async execute(interaction) {
      await runChat(interaction, true);
    }
  }
];