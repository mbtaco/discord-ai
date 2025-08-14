module.exports = {
  name: 'ask',
  async execute(interaction, db) {
    const question = interaction.options.getString('question');

    // Save to PostgreSQL
    try {
      await db.query(
        `INSERT INTO messages (message_id, channel_id, author_id, content, timestamp)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (message_id) DO NOTHING`,
        [
          interaction.id,
          interaction.channelId,
          interaction.user.id,
          question,
          new Date()
        ]
      );
    } catch (err) {
      console.error('Database insert error:', err);
    }

    await interaction.reply(`Hello! You asked: "${question}"`);
  }
};
