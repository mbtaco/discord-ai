// commands/chat.js
const { SlashCommandBuilder } = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Store chat sessions per user
const userChats = {};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("chat")
    .setDescription("Chat with Gemini"),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const userMessage = interaction.options.getString("message");

    // Create new chat session if doesn't exist
    if (!userChats[userId]) {
      userChats[userId] = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
      }).startChat({
        history: [], // empty for now
      });
    }

    const chat = userChats[userId];

    // Send user message
    const result = await chat.sendMessage(userMessage);

    await interaction.editReply(result.response.text());
  },
};