module.exports = {
  name: 'chat',
  async execute(interaction, gemini, conversations) {
    const userMessage = interaction.options.getString('message');
    const newChat = interaction.options.getBoolean('new') || false;
    const key = `${interaction.guildId}-${interaction.channelId}-${interaction.user.id}`;

    // Start fresh if newChat
    if (newChat || !conversations[key]) conversations[key] = [];

    // Add user message
    conversations[key].push({ role: 'user', content: userMessage });

    await interaction.deferReply();

    try {
      const response = await gemini.generateText({
        model: 'gemini-2.5-flash',
        prompt: conversations[key],
        maxOutputTokens: 300
      });

      const answer = response.candidates[0].content;

      // Add AI reply to memory
      conversations[key].push({ role: 'assistant', content: answer });

      await interaction.editReply(answer);
    } catch (err) {
      console.error('Gemini API error:', err);
      await interaction.editReply('❌ Error contacting AI.');
    }
  }
};
