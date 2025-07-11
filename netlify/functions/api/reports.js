const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    // Verify JWT token
    const token = event.headers.authorization?.split(' ')[1];
    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const client = await pool.connect();

    try {
      switch (event.httpMethod) {
        case 'GET':
          const result = await client.query(
            'SELECT * FROM reports WHERE user_id = $1',
            [decoded.sub]
          );
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result.rows)
          };

        case 'POST':
          const { name, type, config } = JSON.parse(event.body);
          const insertResult = await client.query(
            'INSERT INTO reports (name, type, config, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, type, config, decoded.sub]
          );
          return {
            statusCode: 201,
            headers,
            body: JSON.stringify(insertResult.rows[0])
          };

        default:
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
          };
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: error.name === 'JsonWebTokenError' ? 401 : 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
