# Railway Quick Start Guide

## 🚀 One-Command Deployment

The easiest way to deploy your Discord AI bot to Railway:

```bash
./deploy.sh
```

This automated script will:
1. ✅ Check Railway CLI installation
2. 🔐 Verify you're logged in
3. ⚙️ Configure environment variables
4. 🗄️ Set up PostgreSQL with pgvector
5. 📦 Deploy your application
6. 🤖 Deploy Discord slash commands

## Manual Deployment Steps

If you prefer to do it manually:

### 1. Login to Railway
```bash
railway login
```

### 2. Initialize Project
```bash
railway init
```

### 3. Add PostgreSQL Database
```bash
railway add --service postgresql
```

### 4. Set Environment Variables
```bash
railway variables set DISCORD_TOKEN="your_token_here"
railway variables set CLIENT_ID="your_client_id_here" 
railway variables set GEMINI_API_KEY="your_gemini_key_here"
railway variables set NODE_ENV="production"
```

### 5. Deploy Application
```bash
railway up
```

### 6. Deploy Discord Commands
```bash
railway run npm run commands
```

## Required API Keys

You'll need these before deploying:

### Discord Bot Token & Client ID
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create/select your application
3. **Bot section** → Copy **Token**
4. **General Information** → Copy **Application ID**

### Google Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create new API key
3. Copy the generated key

## Bot Invite URL

After deployment, invite your bot using:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274877975552&scope=bot%20applications.commands
```

## Monitoring

```bash
# View deployment status
railway status

# View application logs
railway logs

# Open Railway dashboard
railway open

# Check environment variables
railway variables
```

## What Gets Deployed

- ✅ **Discord Bot** with server context awareness
- ✅ **PostgreSQL Database** with pgvector extension
- ✅ **Vector Embeddings** for message similarity search
- ✅ **Privacy Controls** for user opt-out
- ✅ **Health Monitoring** with automatic restarts
- ✅ **SSL/TLS** encryption for database connections

## Cost

- **Hobby Plan**: $5/month (recommended for small servers)
- **Pro Plan**: $20/month (recommended for active servers)
- **Usage-based pricing** for compute and database storage

## Features Available After Deployment

Your bot will have:
- 🧠 **Server Context Awareness** - Understands your server structure
- 🔍 **Message History Search** - Finds relevant past conversations  
- 🤖 **Enhanced AI Responses** - Context-aware replies using Gemini
- 🔒 **Privacy Controls** - Users can opt-out of data collection
- 💬 **Slash Commands** - `/ai`, `/privacy`, `/clear`, `/help`
- 📊 **Vector Similarity** - Intelligent message retrieval

## Troubleshooting

### Bot not responding?
```bash
railway logs
```

### Database issues?
```bash
railway connect postgresql
```

### Need to redeploy?
```bash
railway up --detach
```

## Support

- 📚 [Full Railway Deployment Guide](./RAILWAY-DEPLOYMENT.md)
- 🛠️ [Setup Documentation](./SETUP.md)
- 🚂 [Railway Documentation](https://docs.railway.app)
- 💬 [Railway Discord](https://discord.gg/railway)

Your Discord AI bot will be running in production within minutes! 🎉
