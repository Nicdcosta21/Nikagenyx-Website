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

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS requests (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Verify token
    const user = verifyToken(event.headers.authorization);
    
    // Connect to database
    const client = await pool.connect();
    
    try {
      const { scheduleId, status, startDate, endDate } = event.queryStringParameters || {};
      
      let query = `
        SELECT r.*, s.name as schedule_name, s.report_id
        FROM schedule_runs r
        JOIN report_schedules s ON r.schedule_id = s.id
        WHERE s.created_by = $1
      `;
      const params = [user.sub];
      
      if (scheduleId) {
        query += ` AND r.schedule_id = $${params.length + 1}`;
        params.push(scheduleId);
      }
      
      if (status) {
        query += ` AND r.status = $${params.length + 1}`;
        params.push(status);
      }
      
      if (startDate) {
        query += ` AND r.start_time >= $${params.length + 1}`;
        params.push(new Date(startDate));
      }
      
      if (endDate) {
        query += ` AND r.start_time <= $${params.length + 1}`;
        params.push(new Date(endDate));
      }
      
      query += ` ORDER BY r.start_time DESC`;
      
      const result = await client.query(query, params);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows)
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error handling schedule runs request:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
