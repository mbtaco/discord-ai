#!/usr/bin/env node

/**
 * Database Explorer - View and analyze your Discord AI bot database
 */

const { Pool } = require('pg');
require('dotenv').config();

class DatabaseExplorer {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false,
    });
  }

  async connect() {
    this.client = await this.pool.connect();
  }

  async disconnect() {
    if (this.client) this.client.release();
    await this.pool.end();
  }

  // Show all tables and their row counts
  async showTables() {
    console.log('\n📊 DATABASE TABLES\n' + '='.repeat(50));
    
    const result = await this.client.query(`
      SELECT 
        schemaname,
        tablename,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = t.tablename) as column_count
      FROM pg_tables t
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    for (const table of result.rows) {
      const countResult = await this.client.query(`SELECT COUNT(*) FROM ${table.tablename}`);
      const rowCount = countResult.rows[0].count;
      console.log(`📋 ${table.tablename.padEnd(15)} | ${rowCount.padStart(6)} rows | ${table.column_count} columns`);
    }
  }

  // Show table structure
  async showTableStructure(tableName) {
    console.log(`\n🏗️  TABLE STRUCTURE: ${tableName.toUpperCase()}\n` + '='.repeat(50));
    
    const result = await this.client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    console.log('Column Name'.padEnd(20) + 'Type'.padEnd(20) + 'Nullable'.padEnd(10) + 'Default');
    console.log('-'.repeat(70));
    
    for (const col of result.rows) {
      const name = col.column_name.padEnd(20);
      const type = col.data_type.padEnd(20);
      const nullable = col.is_nullable.padEnd(10);
      const defaultVal = (col.column_default || 'NULL').substring(0, 20);
      console.log(`${name}${type}${nullable}${defaultVal}`);
    }
  }

  // Show recent messages with embeddings info
  async showMessages(limit = 10) {
    console.log(`\n💬 RECENT MESSAGES (Last ${limit})\n` + '='.repeat(80));
    
    const result = await this.client.query(`
      SELECT 
        m.id,
        m.content,
        u.username,
        c.name as channel_name,
        s.name as server_name,
        m.created_at,
        CASE 
          WHEN m.embedding IS NOT NULL THEN 'Yes'
          ELSE 'No'
        END as has_embedding,
        m.message_type
      FROM messages m
      JOIN users u ON m.user_id = u.id
      JOIN channels c ON m.channel_id = c.id
      JOIN servers s ON m.server_id = s.id
      WHERE m.deleted_at IS NULL
      ORDER BY m.created_at DESC
      LIMIT $1
    `, [limit]);

    if (result.rows.length === 0) {
      console.log('No messages found in database.');
      return;
    }

    for (const msg of result.rows) {
      const content = msg.content.length > 60 ? msg.content.substring(0, 60) + '...' : msg.content;
      console.log(`📝 ${msg.username} in #${msg.channel_name} (${msg.server_name})`);
      console.log(`   "${content}"`);
      console.log(`   📅 ${msg.created_at.toISOString()} | 🧠 Embedding: ${msg.has_embedding} | Type: ${msg.message_type}`);
      console.log('-'.repeat(80));
    }
  }

  // Show server statistics
  async showServerStats() {
    console.log('\n📈 SERVER STATISTICS\n' + '='.repeat(50));
    
    // Server info
    const servers = await this.client.query(`
      SELECT s.name, s.member_count, COUNT(DISTINCT c.id) as channel_count,
             COUNT(DISTINCT m.id) as message_count
      FROM servers s
      LEFT JOIN channels c ON s.id = c.server_id
      LEFT JOIN messages m ON s.id = m.server_id AND m.deleted_at IS NULL
      GROUP BY s.id, s.name, s.member_count
    `);

    for (const server of servers.rows) {
      console.log(`🏠 Server: ${server.name}`);
      console.log(`   👥 Members: ${server.member_count}`);
      console.log(`   📺 Channels: ${server.channel_count}`);
      console.log(`   💬 Messages: ${server.message_count}`);
      console.log();
    }

    // User activity
    const topUsers = await this.client.query(`
      SELECT u.username, u.display_name, COUNT(m.id) as message_count,
             u.opt_out
      FROM users u
      LEFT JOIN messages m ON u.id = m.user_id AND m.deleted_at IS NULL
      GROUP BY u.id, u.username, u.display_name, u.opt_out
      ORDER BY message_count DESC
      LIMIT 5
    `);

    console.log('🏆 TOP USERS BY MESSAGE COUNT:');
    for (const user of topUsers.rows) {
      const optOut = user.opt_out ? ' (Opted Out)' : '';
      console.log(`   ${user.display_name || user.username}: ${user.message_count} messages${optOut}`);
    }
  }

  // Show embedding statistics
  async showEmbeddingStats() {
    console.log('\n🧠 EMBEDDING STATISTICS\n' + '='.repeat(50));
    
    const stats = await this.client.query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(embedding) as messages_with_embeddings,
        ROUND(COUNT(embedding) * 100.0 / COUNT(*), 2) as embedding_percentage
      FROM messages 
      WHERE deleted_at IS NULL
    `);

    const result = stats.rows[0];
    console.log(`📊 Total Messages: ${result.total_messages}`);
    console.log(`🧠 Messages with Embeddings: ${result.messages_with_embeddings}`);
    console.log(`📈 Embedding Coverage: ${result.embedding_percentage}%`);

    // Check if vector operations work
    try {
      await this.client.query("SELECT '[1,2,3]'::vector <-> '[4,5,6]'::vector");
      console.log('✅ Vector operations working');
    } catch (error) {
      console.log('❌ Vector operations not working:', error.message);
    }
  }

  // Search similar messages
  async searchSimilarMessages(searchText, limit = 5) {
    console.log(`\n🔍 SEARCHING FOR: "${searchText}"\n` + '='.repeat(60));
    
    const result = await this.client.query(`
      SELECT 
        m.content,
        u.username,
        c.name as channel_name,
        m.created_at
      FROM messages m
      JOIN users u ON m.user_id = u.id
      JOIN channels c ON m.channel_id = c.id
      WHERE m.deleted_at IS NULL 
        AND LOWER(m.content) LIKE LOWER($1)
      ORDER BY m.created_at DESC
      LIMIT $2
    `, [`%${searchText}%`, limit]);

    if (result.rows.length === 0) {
      console.log('No messages found containing that text.');
      return;
    }

    for (const msg of result.rows) {
      console.log(`👤 ${msg.username} in #${msg.channel_name}`);
      console.log(`   "${msg.content}"`);
      console.log(`   📅 ${msg.created_at.toISOString()}`);
      console.log('-'.repeat(60));
    }
  }

  // Interactive menu
  async showMenu() {
    console.log('\n🎛️  DATABASE EXPLORER MENU\n' + '='.repeat(30));
    console.log('1. Show all tables');
    console.log('2. Show recent messages');
    console.log('3. Show server statistics');
    console.log('4. Show embedding statistics');
    console.log('5. Search messages');
    console.log('6. Show table structure');
    console.log('0. Exit');
    console.log('='.repeat(30));
  }
}

// Main execution
async function main() {
  const explorer = new DatabaseExplorer();
  
  try {
    await explorer.connect();
    console.log('🔗 Connected to Discord AI Bot Database');
    console.log('🚀 Railway pgvector PostgreSQL Database Explorer\n');

    // Show overview by default
    await explorer.showTables();
    await explorer.showServerStats();
    await explorer.showEmbeddingStats();
    await explorer.showMessages(5);

    console.log('\n✨ Database exploration complete!');
    console.log('\nTo explore interactively, you can modify this script or add specific queries.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await explorer.disconnect();
  }
}

// Command line arguments support
const args = process.argv.slice(2);
if (args.length > 0) {
  const command = args[0];
  const explorer = new DatabaseExplorer();
  
  explorer.connect().then(async () => {
    try {
      switch (command) {
        case 'tables':
          await explorer.showTables();
          break;
        case 'messages':
          const limit = args[1] ? parseInt(args[1]) : 10;
          await explorer.showMessages(limit);
          break;
        case 'stats':
          await explorer.showServerStats();
          break;
        case 'embeddings':
          await explorer.showEmbeddingStats();
          break;
        case 'search':
          if (args[1]) {
            await explorer.searchSimilarMessages(args[1]);
          } else {
            console.log('Usage: node explore-database.js search "your search text"');
          }
          break;
        case 'structure':
          if (args[1]) {
            await explorer.showTableStructure(args[1]);
          } else {
            console.log('Usage: node explore-database.js structure tablename');
          }
          break;
        default:
          console.log('Available commands: tables, messages [limit], stats, embeddings, search "text", structure tablename');
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
    } finally {
      await explorer.disconnect();
    }
  });
} else {
  main();
}
