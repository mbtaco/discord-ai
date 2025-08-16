#!/usr/bin/env node

/**
 * Database Setup Script
 * This script initializes the PostgreSQL database with required tables and indexes
 */

const { initializeDatabase } = require('./database');

async function setupDatabase() {
  console.log('🚀 Starting database setup...');
  
  try {
    await initializeDatabase();
    console.log('✅ Database setup completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Deploy slash commands: npm run commands');
    console.log('2. Start the bot: npm start');
    console.log('');
    console.log('Your bot is now ready to use with full server context awareness!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Ensure PostgreSQL is running');
    console.log('2. Check your database connection settings in .env');
    console.log('3. Verify pgvector extension is installed');
    console.log('4. Check database user permissions');
    console.log('');
    console.log('See SETUP.md for detailed instructions.');
    process.exit(1);
  }
}

if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
