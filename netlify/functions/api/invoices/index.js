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

// List invoices
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
    const type = queryParams.get('type');
    const status = queryParams.get('status');
    
    // Connect to database
    const client = await pool.connect();
    
    try {
      // Build the SQL query with parameters
      let query = `
        SELECT 
          i.id, 
          i.invoice_number as "invoiceNumber", 
          i.invoice_type as "invoiceType",
          i.status,
          i.date, 
          i.due_date as "dueDate", 
          i.party_name as "partyName",
          i.party_gstin as "partyGstin",
          i.subtotal,
          i.gst_total as "gstTotal",
          i.total,
          i.created_at as "createdAt",
          u.name as "createdBy"
        FROM 
          invoices i
        JOIN 
          users u ON i.created_by = u.id
        WHERE 1=1
      `;
      
      const queryParams = [];
      let paramCount = 1;
      
      if (startDate) {
        query += ` AND i.date >= $${paramCount}`;
        queryParams.push(startDate);
        paramCount++;
      }
      
      if (endDate) {
        query += ` AND i.date <= $${paramCount}`;
        queryParams.push(endDate);
        paramCount++;
      }
      
      if (type && type !== 'all') {
        query += ` AND i.invoice_type = $${paramCount}`;
        queryParams.push(type);
        paramCount++;
      }
      
      if (status && status !== 'all') {
        query += ` AND i.status = $${paramCount}`;
        queryParams.push(status);
        paramCount++;
      }
      
      query += ` ORDER BY i.date DESC, i.invoice_number DESC`;
      
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
    console.error('Error fetching invoices:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};
