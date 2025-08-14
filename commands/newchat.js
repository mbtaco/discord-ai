import { SlashCommandBuilder } from "discord.js";
import { GoogleGenerativeAI } from "@google/genai";

// Import same map from chat.js
import { userChats } from "./chat.js"; // We'll export it from chat.js

export default {
  data: new SlashCommandBuilder()
    .setName("newchat")
    .setDescription("Start a new chat session with Gemini 2.5 Flash")
    .addStringOption(option =>
      option.setName("message").setDescription("Your message").setRequired(true)
    ),
  
  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const message = interaction.options.getString("message");

    // Reset chat
    userChats.delete(userId);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const chat = model.startChat({ history: [] });
    userChats.set(userId, chat);

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