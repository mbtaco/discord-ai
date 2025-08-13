# Discord Semantic AI Assistant

A Discord bot that answers questions based on your server's chat history using semantic search and Gemini AI.

## Features

- **Multi-server support**: Keeps conversations separate per server.
- **Semantic search**: Finds relevant messages across all channels.
- **Follow-up questions**: `/ask` continues the conversation with context.
- **Fresh queries**: `/asknew` clears history before answering.
- **Message handling**: Updates database on `messageCreate`, `messageUpdate`, `messageDelete`, and `messageDeleteBulk`.
- **Context-aware AI**: Short replies like “Yes” or “Ok” are included via surrounding messages.
- **Date filtering**: Uses parsed timestamps from Gemini 2.5 Flash Lite.
- **High-quality answers**: Uses Gemini 2.5 Pro for final responses.
- **Cooldowns**: Prevents spamming by limiting `/ask` and `/asknew` to every 10 seconds per user.

## Requirements

- Node.js 18+
- Discord.js v14+
- PostgreSQL with pgvector extension
- Gemini API key

## Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/discord-semantic-ai.git
cd discord-semantic-ai
