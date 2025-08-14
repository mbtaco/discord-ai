module.exports = {
  name: 'ask',
  async execute(interaction, db) {
    const question = interaction.options.getString('question');

    try {
      await db.query(
        `INSERT INTO messages (message_id, server_id, channel_id, author_id, content, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          interaction.id,           // Discord interaction ID
          interaction.guildId,      // Server ID
          interaction.channelId,    // Channel ID
          interaction.user.id,      // Author ID
          question,                 // Content
          new Date()                // Timestamp
        ]
      );
    } catch (err) {
      console.error('Database insert error:', err);
    }

    await interaction.reply(`Hello! You asked: "${question}"`);
  }
};
