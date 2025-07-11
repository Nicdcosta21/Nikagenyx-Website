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

// List journal entries
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Verify token
    const user = verifyToken(event.headers.authorization);

    // Parse query parameters
    const queryParams = new URLSearchParams(event.queryStringParameters || {});
    const startDate = queryParams.get('startDate');
    const endDate = queryParams.get('endDate');
    const status = queryParams.get('status');
    
    // Build the SQL query with parameters
    let query = `
      SELECT 
        je.id, 
        je.entry_number as "entryNumber", 
        je.date, 
        je.description, 
        je.reference, 
        je.status,
        je.amount,
        je.created_at as "createdAt",
        u.name as "createdBy"
      FROM 
        journal_entries je
      JOIN 
        users u ON je.created_by = u.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 1;
    
    if (startDate) {
      query += ` AND je.date >= $${paramCount}`;
      queryParams.push(startDate);
      paramCount++;
    }
    
    if (endDate) {
      query += ` AND je.date <= $${paramCount}`;
      queryParams.push(endDate);
      paramCount++;
    }
    
    if (status && status !== 'all') {
      query += ` AND je.status = $${paramCount}`;
      queryParams.push(status);
      paramCount++;
    }
    
    query += ` ORDER BY je.date DESC, je.entry_number DESC`;

    // Connect to database
    const client = await pool.connect();
    
    try {
      // Execute query
      const result = await client.query(query, queryParams);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result.rows)
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};
