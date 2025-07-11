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

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

  try {
    // Verify token
    const user = verifyToken(event.headers.authorization);
    
    // Connect to database
    const client = await pool.connect();
    
    try {
      const pathParts = event.path.split('/');
      const templateId = pathParts[pathParts.length - 1];
      
      switch (event.httpMethod) {
        case 'GET':
          if (templateId && templateId !== 'schedule-templates') {
            // Get specific template
            const result = await client.query(`
              SELECT *
              FROM schedule_templates
              WHERE id = $1 AND created_by = $2
            `, [templateId, user.sub]);
            
            if (result.rows.length === 0) {
              return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Template not found' })
              };
            }
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(result.rows[0])
            };
          } else {
            // List templates
            const result = await client.query(`
              SELECT *
              FROM schedule_templates
              WHERE created_by = $1
              ORDER BY created_at DESC
            `, [user.sub]);
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(result.rows)
            };
          }
          
        case 'POST':
          // Create template
          const data = JSON.parse(event.body);
          
          const result = await client.query(`
            INSERT INTO schedule_templates (
              id,
              name,
              description,
              config,
              created_by
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `, [
            uuidv4(),
            data.name,
            data.description,
            data.config,
            user.sub
          ]);
          
          return {
            statusCode: 201,
            headers,
            body: JSON.stringify(result.rows[0])
          };
          
        case 'PUT':
          // Update template
          const updateData = JSON.parse(event.body);
          
          const updateResult = await client.query(`
            UPDATE schedule_templates
            SET 
              name = $1,
              description = $2,
              config = $3,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $4 AND created_by = $5
            RETURNING *
          `, [
            updateData.name,
            updateData.description,
            updateData.config,
            templateId,
            user.sub
          ]);
          
          if (updateResult.rows.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Template not found' })
            };
          }
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(updateResult.rows[0])
          };
          
        case 'DELETE':
          // Delete template
          await client.query(`
            DELETE FROM schedule_templates
            WHERE id = $1 AND created_by = $2
          `, [templateId, user.sub]);
          
          return {
            statusCode: 204,
            headers,
            body: ''
          };
          
        default:
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
          };
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error handling schedule templates request:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
