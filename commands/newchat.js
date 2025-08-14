export default {
  name: "newchat",
  async execute(interaction) {
    await interaction.deferReply();

    const message = interaction.options.getString("message");
    const userId = interaction.user.id;

    try {
      const { resetChat, getChat } = await import("../sessions.js");
      resetChat(userId); // clear old session
      const chat = getChat(userId); // start fresh
      const result = await chat.sendMessage(message);
      const text = result?.response?.text?.() ?? "⚠️ No response from Gemini.";
      await interaction.editReply(text);
    } catch (err) {
      console.error("Gemini error:", err);
      await interaction.editReply("❌ Error talking to Gemini.");
    }
  }
};