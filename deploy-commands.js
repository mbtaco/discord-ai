const { REST, Routes } = require('discord.js');
require('dotenv').config();

// Slash Commands Definition
// ========================

const commands = [
  {
    name: 'ai',
    description: 'Chat with Gemini AI',
    options: [
      {
        name: 'message',
        description: 'Your message to the AI',
        type: 3, // STRING type
        required: true
      }
    ]
  },
  {
    name: 'clear',
    description: 'Clear your AI conversation history'
  },
  {
    name: 'help',
    description: 'Show bot help information'
  },
  {
    name: 'privacy',
    description: 'Manage your data privacy settings',
    options: [
      {
        name: 'action',
        description: 'Privacy action to take',
        type: 3, // STRING type
        required: true,
        choices: [
          {
            name: 'opt-out',
            value: 'opt-out'
          },
          {
            name: 'opt-in',
            value: 'opt-in'
          },
          {
            name: 'status',
            value: 'status'
          }
        ]
      }
    ]
  },
  {
    name: 'backfill',
    description: 'Backfill database with recent server messages (Admin only)',
    default_member_permissions: '8', // Administrator permission
    options: [
      {
        name: 'limit',
        description: 'Number of messages to backfill (default: 1000, max: 1000)',
        type: 4, // INTEGER type
        required: false,
        min_value: 1,
        max_value: 1000
      }
    ]
  }
];

// Command Deployment
// =================

async function deployCommands() {
  if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN is required in .env file');
    process.exit(1);
  }

  if (!process.env.CLIENT_ID) {
    console.error('❌ CLIENT_ID is required in .env file');
    console.log('💡 You can find this in your Discord Developer Portal under "General Information"');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const clientId = process.env.CLIENT_ID;

  try {
    console.log('🔄 Started refreshing application (/) commands...');

    // Deploy commands globally (available in all servers)
    await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });

    console.log('✅ Successfully registered application (/) commands globally!');
    console.log('📝 Commands registered:');
    commands.forEach(cmd => {
      console.log(`   • /${cmd.name}: ${cmd.description}`);
    });
    
    console.log('\n💡 Note: Global commands may take up to 1 hour to appear in all servers.');
    console.log('   For faster testing, consider using guild-specific commands instead.');
    
  } catch (error) {
    console.error('❌ Error registering slash commands:', error);
    process.exit(1);
  }
}

// Execution
// =========

if (require.main === module) {
  deployCommands()
    .then(() => {
      console.log('\n🎉 Command deployment completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Command deployment failed:', error);
      process.exit(1);
    });
}

module.exports = { commands, deployCommands };
