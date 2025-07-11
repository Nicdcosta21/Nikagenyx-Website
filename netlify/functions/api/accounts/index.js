const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

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

// List all accounts
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Verify token
    const user = verifyToken(event.headers.authorization);

    // Connect to database
    const client = await pool.connect();
    
    try {
      // Query for accounts
      const result = await client.query(`
        SELECT 
          a.id, 
          a.code, 
          a.name, 
          a.description, 
          a.type, 
          a.subtype, 
          a.is_active, 
          a.parent_id, 
          a.tax_rate,
          COALESCE(
            (SELECT SUM(CASE WHEN je.debit_account_id = a.id THEN je.amount ELSE -je.amount END) 
             FROM journal_entries je 
             WHERE je.debit_account_id = a.id OR je.credit_account_id = a.id),
            0
          ) + a.opening_balance AS balance
        FROM 
          accounts a
        ORDER BY 
          a.code ASC
      `);
      
      // Transform database results to camelCase
      const accounts = result.rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        type: row.type,
        subtype: row.subtype,
        isActive: row.is_active,
        parentId: row.parent_id,
        taxRate: row.tax_rate,
        openingBalance: row.opening_balance,
        balance: parseFloat(row.balance)
      }));

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(accounts)
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching accounts:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};
