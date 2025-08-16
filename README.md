# Discord AI Bot 🤖

A powerful Discord bot powered by Google Gemini AI with server context awareness, vector similarity search, and conversation memory.

## ✨ Features

- **🧠 Server Context Awareness**: Understands server structure, channels, and members
- **🔍 Vector Similarity Search**: Uses pgvector to find relevant message history
- **🤖 AI-Powered Responses**: Google Gemini 2.5 Flash with enhanced context
- **💾 Message Storage**: PostgreSQL database with embeddings for intelligent retrieval
- **🔒 Privacy Controls**: User opt-out system with `/privacy` commands
- **💬 Multiple Interaction Methods**: 
  - Slash commands (`/ai`, `/help`, `/privacy`, `/clear`)
  - Direct mentions in channels
- **📊 Rich Embeds**: Beautiful Discord embeds with user avatars
- **🛡️ Modern Architecture**: Discord.js v14, Railway hosting, production-ready

## 🚀 Live Demo

This bot is currently deployed and running on Railway with full production capabilities.

## 📋 Available Commands

- `/ai <message>` - Chat with AI using full server context
- `/help` - Show bot capabilities and features
- `/privacy opt-out` - Exclude your messages from collection
- `/privacy opt-in` - Re-enable message collection
- `/privacy status` - Check your current privacy setting
- `/clear` - Clear conversation history for current channel

## 🔧 Technical Stack

- **Backend**: Node.js with Discord.js v14
- **AI**: Google Gemini 2.5 Flash + text-embedding-004
- **Database**: PostgreSQL with pgvector extension
- **Hosting**: Railway with auto-scaling
- **Vector Search**: Cosine similarity on 768-dimensional embeddings

## 🏗️ Architecture

```
Discord Messages → Bot → Embeddings → PostgreSQL/pgvector → Context Retrieval → AI Response
```

1. **Message Processing**: All server messages are captured and stored
2. **Embedding Generation**: Google's text-embedding-004 creates vector representations
3. **Vector Storage**: PostgreSQL with pgvector stores embeddings efficiently
4. **Context Retrieval**: Similarity search finds relevant past conversations
5. **AI Enhancement**: Gemini uses server context + message history for responses

## 🔒 Privacy & Data

- **Opt-out System**: Users can exclude their messages with `/privacy opt-out`
- **Transparent Storage**: Clear privacy status checking with `/privacy status`
- **Secure Hosting**: Railway production environment with SSL
- **Data Retention**: Configurable retention policies

## 📁 Project Structure

```
discord-ai/
├── index.js              # Main bot logic and event handlers
├── database.js           # PostgreSQL + pgvector operations
├── deploy-commands.js    # Discord slash command registration
├── start-production.js   # Production startup with health checks
├── railway.json          # Railway deployment configuration
├── SETUP.md              # Local development setup guide
├── RAILWAY-DEPLOYMENT.md # Railway deployment guide
└── package.json          # Dependencies and scripts
```

## 🛠️ Development Setup

For local development, see [SETUP.md](./SETUP.md)

## 🚂 Railway Deployment

For production deployment to Railway, see [RAILWAY-DEPLOYMENT.md](./RAILWAY-DEPLOYMENT.md)

**⚠️ Important**: Use Railway's **pgvector template**, not regular PostgreSQL, for vector similarity search functionality.

## 📊 Key Capabilities

### Server Context Awareness
- Tracks all channels, members, and server metadata
- Understands server structure and relationships
- Provides context about recent active users

### Vector Similarity Search
- 768-dimensional embeddings for semantic search
- Finds relevant conversations across time
- Intelligent context retrieval for AI responses

### Privacy Compliance
- User-controlled opt-out system
- Transparent data handling
- GDPR-friendly design

## 🔄 Scripts

- `npm start` - Start bot locally
- `npm run start:production` - Production startup with database migration
- `npm run dev` - Development mode with nodemon
- `npm run commands` - Deploy Discord slash commands

## 🌟 Production Features

✅ **Auto-scaling** on Railway  
✅ **Health monitoring** with automatic restarts  
✅ **Database migrations** on startup  
✅ **Error handling** and logging  
✅ **SSL connections** where supported  
✅ **Environment-based configuration**  

## 📈 Performance

- **Vector Search**: Sub-second similarity queries
- **Memory Efficient**: Connection pooling and cleanup
- **Scalable**: Handles multiple servers simultaneously
- **Reliable**: Production-grade error handling

## 🤝 Contributing

This is a production Discord bot. For modifications:

1. Fork the repository
2. Create a feature branch
3. Test thoroughly in development
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🎯 Use Cases

Perfect for:
- **Community Servers**: Enhanced AI with server knowledge
- **Support Channels**: Context-aware assistance
- **Knowledge Bases**: Semantic search across conversations
- **Team Communication**: AI that understands your workspace

---

**Your Discord AI bot with server context awareness and vector similarity search! 🚀**