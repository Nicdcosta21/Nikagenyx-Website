const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Helper function to verify JWT token
const verifyToken = (authHeader) => {
  if (!authHeader) {
    throw new Error('Authorization header is required');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new Error('Bearer token is missing');
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Create a new account
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Verify token
    const user = verifyToken(event.headers.authorization);
    
    // Parse request body
    const data = JSON.parse(event.body);
    
    // Validate required fields
    if (!data.code || !data.name || !data.type) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Code, name, and type are required fields' })
      };
    }
    
    // Connect to database
    const client = await pool.connect();
    
    try {
      // Check if code already exists
      const checkResult = await client.query('SELECT id FROM accounts WHERE code = $1', [data.code]);
      if (checkResult.rows.length > 0) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Account code already exists' })
        };
      }
      
      // Insert new account
      const id = uuidv4();
      await client.query(`
        INSERT INTO accounts (
          id,
          code,
          name,
          description,
          type,
          subtype,
          is_active,
          parent_id,
          tax_rate,
          opening_balance,
          created_by,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      `, [
        id,
        data.code,
        data.name,
        data.description || '',
        data.type,
        data.subtype || null,
        data.isActive !== false,
        data.parentId || null,
        data.taxRate || 0,
        data.openingBalance || 0,
        user.sub  // user ID from JWT token
      ]);
      
      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id,
          message: 'Account created successfully' 
        })
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating account:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
