#!/bin/bash

# Discord AI Bot - Railway Deployment Script
# This script automates the deployment process to Railway

set -e  # Exit on any error

echo "🚀 Discord AI Bot - Railway Deployment"
echo "======================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed. Please install it first:"
    echo "   curl -fsSL https://railway.app/install.sh | sh"
    exit 1
fi

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "🔐 Please log in to Railway first:"
    echo "   railway login"
    echo ""
    read -p "Press Enter after you've logged in..."
fi

# Check for required environment variables
echo "🔍 Checking required environment variables..."

if [ -z "$DISCORD_TOKEN" ] && [ -z "$(railway variables get DISCORD_TOKEN 2>/dev/null)" ]; then
    echo "⚠️  DISCORD_TOKEN not found"
    read -p "Enter your Discord Bot Token: " discord_token
    railway variables set DISCORD_TOKEN="$discord_token"
fi

if [ -z "$CLIENT_ID" ] && [ -z "$(railway variables get CLIENT_ID 2>/dev/null)" ]; then
    echo "⚠️  CLIENT_ID not found"
    read -p "Enter your Discord Client ID: " client_id
    railway variables set CLIENT_ID="$client_id"
fi

if [ -z "$GEMINI_API_KEY" ] && [ -z "$(railway variables get GEMINI_API_KEY 2>/dev/null)" ]; then
    echo "⚠️  GEMINI_API_KEY not found"
    read -p "Enter your Google Gemini API Key: " gemini_key
    railway variables set GEMINI_API_KEY="$gemini_key"
fi

# Set NODE_ENV to production
railway variables set NODE_ENV=production

echo "✅ Environment variables configured"

# Check if PostgreSQL service exists, if not, create it
echo "🗄️ Setting up PostgreSQL database..."
if ! railway service list | grep -q "postgresql"; then
    echo "Creating PostgreSQL service..."
    railway add --service postgresql
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 10
fi

echo "✅ PostgreSQL database ready"

# Deploy the application
echo "📦 Deploying application to Railway..."
railway up --detach

echo "⏳ Waiting for deployment to complete..."
sleep 30

# Deploy Discord slash commands
echo "🤖 Deploying Discord slash commands..."
railway run npm run commands

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "Next steps:"
echo "1. Check your deployment: railway open"
echo "2. View logs: railway logs"
echo "3. Invite your bot to Discord servers using this URL:"
echo "   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274877975552&scope=bot%20applications.commands"
echo ""
echo "Replace YOUR_CLIENT_ID with your actual Client ID."
echo ""
echo "Your Discord AI bot is now running in production! 🚀"
