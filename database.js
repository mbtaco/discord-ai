const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Database connection configuration
const getDatabaseConfig = () => {
  // Railway provides DATABASE_URL automatically
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }
  
  // Fallback to individual environment variables
  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'discord_ai',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
};

const pool = new Pool(getDatabaseConfig());

// Initialize Gemini for embeddings
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// Database initialization
async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS servers (
        id BIGINT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        member_count INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS channels (
        id BIGINT PRIMARY KEY,
        server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type INTEGER NOT NULL,
        topic TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        avatar_url TEXT,
        opt_out BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id BIGINT PRIMARY KEY,
        server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
        channel_id BIGINT REFERENCES channels(id) ON DELETE CASCADE,
        user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        embedding vector(768),
        message_type VARCHAR(50) DEFAULT 'normal',
        reply_to BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_server_channel 
      ON messages(server_id, channel_id) 
      WHERE deleted_at IS NULL
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_embedding 
      ON messages USING ivfflat (embedding vector_cosine_ops) 
      WITH (lists = 100)
      WHERE deleted_at IS NULL AND embedding IS NOT NULL
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_created_at 
      ON messages(created_at DESC) 
      WHERE deleted_at IS NULL
    `);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Message operations
async function storeMessage(messageData) {
  const client = await pool.connect();
  
  try {
    // Check if user has opted out
    const userCheck = await client.query(
      'SELECT opt_out FROM users WHERE id = $1',
      [messageData.userId]
    );
    
    if (userCheck.rows.length > 0 && userCheck.rows[0].opt_out) {
      return null; // Skip storing message for opted-out users
    }

    // Generate embedding for the message content
    const embedding = await generateEmbedding(messageData.content);
    
    const result = await client.query(`
      INSERT INTO messages (id, server_id, channel_id, user_id, content, embedding, message_type, reply_to)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        embedding = EXCLUDED.embedding,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      messageData.id,
      messageData.serverId,
      messageData.channelId,
      messageData.userId,
      messageData.content,
      embedding ? `[${embedding.join(',')}]` : null,
      messageData.messageType || 'normal',
      messageData.replyTo || null
    ]);

    return result.rows[0];
  } catch (error) {
    console.error('Error storing message:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function updateMessage(messageId, newContent) {
  const client = await pool.connect();
  
  try {
    const embedding = await generateEmbedding(newContent);
    
    const result = await client.query(`
      UPDATE messages 
      SET content = $1, embedding = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND deleted_at IS NULL
      RETURNING *
    `, [
      newContent,
      embedding ? `[${embedding.join(',')}]` : null,
      messageId
    ]);

    return result.rows[0];
  } catch (error) {
    console.error('Error updating message:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function deleteMessage(messageId) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      UPDATE messages 
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [messageId]);

    return result.rows[0];
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Server and channel operations
async function upsertServer(serverData) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      INSERT INTO servers (id, name, member_count)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        member_count = EXCLUDED.member_count,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [serverData.id, serverData.name, serverData.memberCount]);

    return result.rows[0];
  } catch (error) {
    console.error('Error upserting server:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function upsertChannel(channelData) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      INSERT INTO channels (id, server_id, name, type, topic)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        topic = EXCLUDED.topic,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [channelData.id, channelData.serverId, channelData.name, channelData.type, channelData.topic]);

    return result.rows[0];
  } catch (error) {
    console.error('Error upserting channel:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function upsertUser(userData) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      INSERT INTO users (id, username, display_name, avatar_url)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [userData.id, userData.username, userData.displayName, userData.avatarUrl]);

    return result.rows[0];
  } catch (error) {
    console.error('Error upserting user:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Embedding and similarity search
async function generateEmbedding(text) {
  try {
    if (!text || text.trim().length === 0) return null;
    
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

async function findSimilarMessages(queryEmbedding, serverId, channelId = null, limit = 10) {
  const client = await pool.connect();
  
  try {
    let query = `
      SELECT m.*, u.username, u.display_name, c.name as channel_name,
             1 - (embedding <=> $1) as similarity
      FROM messages m
      JOIN users u ON m.user_id = u.id
      JOIN channels c ON m.channel_id = c.id
      WHERE m.server_id = $2 
        AND m.deleted_at IS NULL 
        AND m.embedding IS NOT NULL
        AND u.opt_out = FALSE
    `;
    
    const params = [`[${queryEmbedding.join(',')}]`, serverId];
    
    if (channelId) {
      query += ` AND m.channel_id = $3`;
      params.push(channelId);
    }
    
    query += `
      ORDER BY similarity DESC
      LIMIT $${params.length + 1}
    `;
    params.push(limit);

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error finding similar messages:', error);
    return [];
  } finally {
    client.release();
  }
}

// Context retrieval
async function getServerContext(serverId) {
  const client = await pool.connect();
  
  try {
    // Get server info
    const serverResult = await client.query(`
      SELECT s.*, COUNT(DISTINCT c.id) as channel_count
      FROM servers s
      LEFT JOIN channels c ON s.id = c.server_id
      WHERE s.id = $1
      GROUP BY s.id
    `, [serverId]);

    // Get channels
    const channelsResult = await client.query(`
      SELECT id, name, type, topic
      FROM channels
      WHERE server_id = $1
      ORDER BY name
    `, [serverId]);

    // Get recent active users
    const usersResult = await client.query(`
      SELECT DISTINCT u.username, u.display_name
      FROM users u
      JOIN messages m ON u.id = m.user_id
      WHERE m.server_id = $1 
        AND m.created_at > NOW() - INTERVAL '7 days'
        AND m.deleted_at IS NULL
        AND u.opt_out = FALSE
      ORDER BY u.username
      LIMIT 50
    `, [serverId]);

    return {
      server: serverResult.rows[0] || null,
      channels: channelsResult.rows,
      recentUsers: usersResult.rows
    };
  } catch (error) {
    console.error('Error getting server context:', error);
    return { server: null, channels: [], recentUsers: [] };
  } finally {
    client.release();
  }
}

// Privacy controls
async function setUserOptOut(userId, optOut = true) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      UPDATE users 
      SET opt_out = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [optOut, userId]);

    // If opting out, also mark their messages as deleted
    if (optOut) {
      await client.query(`
        UPDATE messages 
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND deleted_at IS NULL
      `, [userId]);
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error setting user opt-out:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initializeDatabase,
  storeMessage,
  updateMessage,
  deleteMessage,
  upsertServer,
  upsertChannel,
  upsertUser,
  generateEmbedding,
  findSimilarMessages,
  getServerContext,
  setUserOptOut
};
