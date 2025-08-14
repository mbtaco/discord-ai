import { SlashCommandBuilder } from "discord.js";
import { GoogleGenerativeAI } from "@google/genai";

// Store sessions per user
export const userChats = new Map();

export default {
  data: new SlashCommandBuilder()
    .setName("chat")
    .setDescription("Chat with Gemini 2.5 Flash")
    .addStringOption(option =>
      option.setName("message").setDescription("Your message").setRequired(true)
    ),
  
  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const message = interaction.options.getString("message");

    // Init Gemini client
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Create chat session if not exists
    if (!userChats.has(userId)) {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const chat = model.startChat({ history: [] });
      userChats.set(userId, chat);
    }

    const chat = userChats.get(userId);

    try {
      const result = await chat.sendMessage(message);
      const text = result.response.text();
      await interaction.editReply(text || "⚠️ No response from Gemini.");
    } catch (err) {
      console.error(err);
      await interaction.editReply("⚠️ Error talking to Gemini.");
    }
  }
};