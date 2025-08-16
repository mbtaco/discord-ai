#!/usr/bin/env node

/**
 * Script to clear guild-specific slash commands
 */

const { REST, Routes } = require('discord.js');
require('dotenv').config();

async function clearGuildCommands(guildId) {
  if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN is required in .env file');
    process.exit(1);
  }

  if (!process.env.CLIENT_ID) {
    console.error('❌ CLIENT_ID is required in .env file');
    process.exit(1);
  }

  if (!guildId) {
    console.error('❌ Guild ID is required');
    console.log('Usage: node clear-guild-commands.js GUILD_ID');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const clientId = process.env.CLIENT_ID;

  try {
    console.log(`🗑️ Clearing guild commands for guild ${guildId}...`);

    // Get existing guild commands
    const commands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));
    console.log(`📋 Found ${commands.length} guild commands to remove`);

    if (commands.length > 0) {
      commands.forEach(cmd => {
        console.log(`   • /${cmd.name}`);
      });
    }

    // Clear all guild commands by setting empty array
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });

    console.log(`✅ Successfully cleared all guild commands for guild ${guildId}!`);
    console.log('💡 Global commands will remain active across all servers.');
    
  } catch (error) {
    console.error('❌ Error clearing guild commands:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  const guildId = process.argv[2];
  
  clearGuildCommands(guildId)
    .then(() => {
      console.log('\n🎉 Guild command cleanup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Guild command cleanup failed:', error);
      process.exit(1);
    });
}
