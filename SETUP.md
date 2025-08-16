# Discord AI Bot Setup Guide

This guide will help you set up the Discord AI bot with PostgreSQL database integration for server context awareness.

## Prerequisites

1. **Node.js** (v16.11.0 or higher)
2. **PostgreSQL** (v12 or higher) with **pgvector** extension
3. **Discord Bot Token** and **Client ID**
4. **Google Gemini API Key**

## Database Setup

### 1. Install PostgreSQL with pgvector

**macOS (using Homebrew):**
```bash
brew install postgresql pgvector
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo apt install postgresql-14-pgvector  # Replace 14 with your PostgreSQL version
```

**Docker (Alternative):**
```bash
docker run --name discord-ai-db -e POSTGRES_PASSWORD=your_password -p 5432:5432 -d pgvector/pgvector:pg16
```

### 2. Create Database and User

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE discord_ai;
CREATE USER discord_bot WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE discord_ai TO discord_bot;

# Connect to the new database
\c discord_ai

# Enable pgvector extension
CREATE EXTENSION vector;

# Exit PostgreSQL
\q
```

## Bot Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the project root with the following variables:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here

# Google Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discord_ai
DB_USER=discord_bot
DB_PASSWORD=your_secure_password

# Alternative: Use a complete database URL
# DATABASE_URL=postgresql://discord_bot:your_secure_password@localhost:5432/discord_ai

# Environment
NODE_ENV=development
```

### 3. Getting Required Tokens

#### Discord Bot Token and Client ID:
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select existing one
3. Go to "Bot" section and copy the **Token**
4. Go to "General Information" and copy the **Application ID** (Client ID)

#### Google Gemini API Key:
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the generated key

### 4. Bot Permissions

When inviting your bot to servers, ensure it has these permissions:
- Read Messages/View Channels
- Send Messages
- Use Slash Commands
- Read Message History
- Add Reactions
- Embed Links

**Invite URL format:**
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274877975552&scope=bot%20applications.commands
```

## Deployment

### 1. Deploy Slash Commands

```bash
npm run commands
```

### 2. Start the Bot

```bash
# Development
npm run dev

# Production
npm start
```

## Features

### Core Functionality
- **Server Context Awareness**: Bot understands server structure, channels, and members
- **Vector Similarity Search**: Uses embeddings to find relevant message history
- **Message Persistence**: Stores messages with embeddings for context retrieval
- **Privacy Controls**: Users can opt-out of message collection

### Commands
- `/ai <message>` - Chat with AI using server context
- `/clear` - Clear conversation history for current channel
- `/privacy <action>` - Manage data privacy (opt-out/opt-in/status)
- `/help` - Show help information

### Privacy Features
- Users can opt-out of message collection
- Opted-out users' messages are not stored or used for context
- Existing messages are marked as deleted when opting out
- Transparent privacy status checking

## Database Schema

The bot automatically creates these tables:
- `servers` - Discord server information
- `channels` - Channel metadata
- `users` - User information and privacy preferences
- `messages` - Message content with embeddings

## Monitoring

The bot logs important events:
- Database connection status
- Message processing errors
- Privacy setting changes
- Server synchronization

## Troubleshooting

### Common Issues

1. **pgvector extension not found:**
   - Ensure pgvector is installed for your PostgreSQL version
   - Verify extension is enabled: `CREATE EXTENSION IF NOT EXISTS vector;`

2. **Permission errors:**
   - Check bot permissions in Discord server settings
   - Verify database user has necessary privileges

3. **Embedding generation fails:**
   - Check Gemini API key validity
   - Monitor API rate limits

4. **Memory usage:**
   - Consider implementing message retention policies
   - Monitor database size and implement cleanup routines

### Performance Optimization

1. **Database Indexing:**
   - The bot creates necessary indexes automatically
   - Monitor query performance and add indexes as needed

2. **Embedding Storage:**
   - Consider using quantized embeddings for storage efficiency
   - Implement periodic cleanup of old embeddings

3. **Memory Management:**
   - Adjust conversation history limits based on usage
   - Monitor Node.js memory usage

## Security Considerations

1. **API Keys:**
   - Never commit `.env` files to version control
   - Use environment variables in production
   - Rotate keys regularly

2. **Database Security:**
   - Use strong passwords for database users
   - Enable SSL connections in production
   - Regular security updates

3. **Privacy Compliance:**
   - Inform users about data collection
   - Respect opt-out preferences
   - Implement data retention policies
   - Consider GDPR/CCPA compliance if applicable

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review bot logs for error messages
3. Verify all configuration settings
4. Test with minimal setup first
