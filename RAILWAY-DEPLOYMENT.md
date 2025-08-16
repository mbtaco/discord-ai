# Railway Deployment Guide

This guide will help you deploy your Discord AI bot to Railway with PostgreSQL database support.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway CLI**: Install the Railway CLI
3. **Git Repository**: Your code should be in a Git repository
4. **Discord Bot Token** and **Client ID**
5. **Google Gemini API Key**

## Step 1: Install Railway CLI

```bash
# macOS/Linux
curl -fsSL https://railway.app/install.sh | sh

# Windows (PowerShell)
iwr https://railway.app/install.ps1 | iex

# Alternative: npm
npm install -g @railway/cli
```

## Step 2: Login to Railway

```bash
railway login
```

This will open your browser to authenticate with Railway.

## Step 3: Create a New Railway Project

```bash
# Navigate to your project directory
cd /path/to/your/discord-ai

# Initialize Railway project
railway init
```

Choose:
- **Create a new project**
- Give it a name like "discord-ai-bot"
- Choose your team/personal account

## Step 4: Add PostgreSQL Database

In your Railway project dashboard:

1. Click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Railway will automatically:
   - Create a PostgreSQL instance
   - Install the `pgvector` extension
   - Generate a `DATABASE_URL` environment variable

## Step 5: Configure Environment Variables

In your Railway project dashboard, go to **Variables** and add:

```env
# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here

# Google Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Environment
NODE_ENV=production

# Note: DATABASE_URL is automatically provided by Railway PostgreSQL
```

### How to get these values:

#### Discord Bot Token and Client ID:
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application → **Bot** → Copy **Token**
3. Go to **General Information** → Copy **Application ID** (Client ID)

#### Google Gemini API Key:
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the generated key

## Step 6: Deploy Your Bot

```bash
# Deploy to Railway
railway up

# Or use the npm script
npm run deploy:railway
```

Railway will:
1. Build your application
2. Install dependencies
3. Run the production startup script
4. Initialize the database with pgvector
5. Start your Discord bot

## Step 7: Deploy Slash Commands

After your bot is deployed and running:

```bash
# Run this locally to deploy commands to Discord
npm run commands
```

Or you can run it on Railway:
```bash
railway run npm run commands
```

## Step 8: Invite Bot to Your Server

Create an invite URL with the correct permissions:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274877975552&scope=bot%20applications.commands
```

Replace `YOUR_CLIENT_ID` with your actual Client ID.

**Required Permissions:**
- Read Messages/View Channels
- Send Messages
- Use Slash Commands
- Read Message History
- Add Reactions
- Embed Links

## Monitoring and Logs

### View Logs
```bash
railway logs
```

### Check Service Status
```bash
railway status
```

### Connect to Database
```bash
railway connect postgresql
```

## Environment-Specific Configurations

### Railway Automatic Features:
- **Database URL**: Automatically provided as `DATABASE_URL`
- **pgvector Extension**: Automatically installed
- **SSL Connections**: Automatically configured
- **Health Checks**: Built into the deployment
- **Auto-restart**: On failure

### Custom Health Check
The bot includes a health check endpoint at `/health` that Railway uses to monitor the service.

## Troubleshooting

### Common Issues:

1. **Bot not responding:**
   - Check logs: `railway logs`
   - Verify environment variables are set
   - Ensure Discord token is valid

2. **Database connection errors:**
   - Verify PostgreSQL service is running in Railway dashboard
   - Check if `DATABASE_URL` is set automatically
   - Ensure pgvector extension is installed

3. **Embedding errors:**
   - Verify Gemini API key is valid and has quota
   - Check network connectivity to Google APIs

4. **Slash commands not appearing:**
   - Run `npm run commands` to deploy commands
   - Wait up to 1 hour for global commands to propagate

### Useful Railway Commands:

```bash
# View all services
railway status

# View environment variables
railway variables

# Open project dashboard
railway open

# Connect to database
railway connect postgresql

# Run commands on Railway
railway run npm run commands

# Scale your service
railway up --detach
```

## Performance Optimization

### Railway Plan Considerations:
- **Hobby Plan**: $5/month, suitable for small communities
- **Pro Plan**: $20/month, better for larger servers with more activity
- **Scale with usage**: Railway auto-scales based on your plan

### Database Optimization:
- Monitor database size in Railway dashboard
- Consider implementing message retention policies
- Use the built-in pgvector indexes for performance

### Memory Management:
- Monitor memory usage in Railway metrics
- Adjust conversation history limits if needed
- Consider implementing periodic cleanup

## Scaling Considerations

### For Large Servers:
1. **Database Optimization:**
   - Implement message retention policies
   - Add custom indexes for frequently queried data
   - Consider database connection pooling

2. **Memory Management:**
   - Monitor Node.js memory usage
   - Implement conversation history limits
   - Use streaming for large embeddings

3. **API Rate Limiting:**
   - Monitor Gemini API usage
   - Implement request queuing for high-traffic servers
   - Consider caching frequently accessed embeddings

## Security Best Practices

1. **Environment Variables:**
   - Never commit secrets to Git
   - Use Railway's variable management
   - Rotate API keys regularly

2. **Database Security:**
   - Railway handles SSL automatically
   - Database is isolated and secured
   - Regular backups are automatic

3. **Bot Permissions:**
   - Use minimum required permissions
   - Regularly audit bot access
   - Monitor bot activity logs

## Backup and Recovery

Railway provides:
- **Automatic database backups**
- **Point-in-time recovery**
- **Data export capabilities**

Access these features in your Railway dashboard under the PostgreSQL service.

## Cost Optimization

### Railway Pricing:
- **Hobby**: $5/month - Good for small communities
- **Pro**: $20/month - Better for active servers
- **Usage-based**: Pay for what you use

### Tips to Reduce Costs:
1. Implement message retention policies
2. Monitor embedding generation frequency
3. Use conversation history limits
4. Regular database cleanup

## Support and Monitoring

### Railway Support:
- [Railway Documentation](https://docs.railway.app)
- [Railway Discord Community](https://discord.gg/railway)
- [Railway Status Page](https://status.railway.app)

### Bot Monitoring:
- Use Railway's built-in metrics
- Monitor logs for errors
- Set up alerts for downtime
- Track database growth

## Next Steps

After successful deployment:

1. **Test all features** in your Discord server
2. **Monitor performance** and logs
3. **Set up regular maintenance** routines
4. **Consider implementing** additional features like:
   - Message retention policies
   - Advanced analytics
   - Custom command handlers
   - Multi-server management

Your Discord AI bot is now running in production with full server context awareness!
