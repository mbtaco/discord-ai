#!/usr/bin/env node

/**
 * Script to clear global slash commands
 */

const { REST, Routes } = require('discord.js');
require('dotenv').config();

async function clearGlobalCommands() {
  if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN is required in .env file');
    process.exit(1);
  }

  if (!process.env.CLIENT_ID) {
    console.error('❌ CLIENT_ID is required in .env file');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const clientId = process.env.CLIENT_ID;

  try {
    console.log('🗑️ Clearing global slash commands...');

    // Get existing global commands
    const commands = await rest.get(Routes.applicationCommands(clientId));
    console.log(`📋 Found ${commands.length} global commands to remove`);

    if (commands.length > 0) {
      commands.forEach(cmd => {
        console.log(`   • /${cmd.name}`);
      });
    }

    // Clear all global commands by setting empty array
    await rest.put(Routes.applicationCommands(clientId), { body: [] });

    console.log('✅ Successfully cleared all global slash commands!');
    console.log('💡 Guild commands will remain active in your specific servers.');
    
  } catch (error) {
    console.error('❌ Error clearing global commands:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  clearGlobalCommands()
    .then(() => {
      console.log('\n🎉 Global command cleanup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Command cleanup failed:', error);
      process.exit(1);
    });
}
