# Discord AI Bot 🤖

A powerful Discord bot powered by Google Gemini AI with conversation memory and modern Discord.js features.

## ✨ Features

- **AI-Powered Responses**: Uses Google Gemini 2.5 Flash for intelligent conversations
- **Conversation Memory**: Remembers chat context per channel (last 20 messages)
- **Multiple Interaction Methods**: 
  - Slash commands (`/ai`, `/clear`, `/help`)
  - Direct mentions in channels
- **Rich Embeds**: Beautiful Discord embeds with user avatars and formatting
- **Error Handling**: Robust error handling with user-friendly messages
- **Modern Discord.js**: Built with Discord.js v14 and latest features

## 🚀 Quick Start

### Prerequisites

- Node.js 16.11.0 or higher
- Discord Bot Token
- Discord Client ID
- Google Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd discord-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your tokens:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_discord_client_id_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Register slash commands (one-time setup)**
   ```bash
   npm run commands
   ```

5. **Start the bot**
   ```bash
   # Production
   npm start
   
   # Development (with auto-restart)
   npm run dev
   ```

## 🔧 Setup Guide

### Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the bot token to your `.env` file
5. Enable required intents:
   - Server Members Intent
   - Message Content Intent
6. Use this OAuth2 URL to invite the bot:
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2048&scope=bot%20applications.commands
   ```

### Google Gemini API Setup

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Copy the API key to your `.env` file

## 📝 Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/ai` | Chat with Gemini AI | `/ai Hello, how are you?` |
| `/clear` | Clear conversation history | `/clear` |
| `/help` | Show bot help information | `/help` |

## 💬 Usage Examples

### Slash Commands
- `/ai What's the weather like today?`
- `/ai Can you help me with JavaScript?`
- `/clear` (to reset conversation)

### Mentions
- `@bot Hello there!`
- `@bot What's 2+2?`

## 🏗️ Project Structure

```
discord-ai/
├── index.js          # Main bot file
├── package.json      # Dependencies and scripts
├── env.example      # Environment variables template
├── .env             # Your environment variables (create this)
└── README.md        # This file
```

## 🔒 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Your Discord bot token | ✅ |
| `GEMINI_API_KEY` | Your Google Gemini API key | ✅ |

## 🛠️ Development

### Running in Development Mode
```bash
npm run dev
```
This uses nodemon to automatically restart the bot when files change.

### Command Registration
```bash
npm run commands
```
This registers/updates slash commands with Discord. Only needs to be run when you add/modify commands.

### Code Structure
The bot is organized into clear sections:
- **Configuration & Initialization**: Environment setup and client config
- **System Prompt & Utilities**: AI prompt and helper functions
- **Slash Commands**: Command definitions and handlers
- **Conversation Management**: Chat history and AI integration
- **Event Handlers**: Discord.js event handling
- **Error Handling**: Comprehensive error management

## 🚨 Troubleshooting

### Common Issues

1. **Bot not responding to commands**
   - Check if the bot has proper permissions
   - Verify slash commands are registered (check console logs)
   - Ensure the bot is online

2. **AI responses not working**
   - Verify your Gemini API key is correct
   - Check if you have sufficient API quota
   - Look for errors in the console

3. **Bot crashes on startup**
   - Ensure all environment variables are set
   - Check Node.js version (16.11.0+)
   - Verify Discord token is valid

### Logs
The bot provides detailed console logging:
- ✅ Success messages
- ❌ Error messages
- 🔄 Status updates
- 🔐 Login progress

## 📚 Dependencies

- **discord.js**: Discord API wrapper
- **@google/generative-ai**: Google Gemini AI integration
- **dotenv**: Environment variable management
- **nodemon**: Development auto-restart (dev dependency)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the console logs for errors
3. Ensure all setup steps are completed
4. Open an issue with detailed error information

---

**Happy coding! 🎉**
