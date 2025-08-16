#!/usr/bin/env node

/**
 * Production Startup Script for Railway
 * This script handles database initialization and starts the bot
 */

const { initializeDatabase } = require('./database');

async function startProduction() {
  console.log('🚀 Starting Discord AI Bot in production mode...');
  
  try {
    // Initialize database first
    console.log('📊 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully');
    
    // Start the bot
    console.log('🤖 Starting Discord bot...');
    require('./index');
    
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    console.error('Stack trace:', error.stack);
    
    // Log environment info for debugging
    console.log('Environment info:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- DATABASE_URL present:', !!process.env.DATABASE_URL);
    console.log('- DISCORD_TOKEN present:', !!process.env.DISCORD_TOKEN);
    console.log('- GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
    
    process.exit(1);
  }
}

// Health check endpoint for Railway
const http = require('http');
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌐 Health check server running on port ${PORT}`);
});

if (require.main === module) {
  startProduction();
}
