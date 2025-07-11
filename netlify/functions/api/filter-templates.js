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
          if (templateId && templateId !== 'filter-templates') {
            // Get specific template
            const result = await client.query(`
              SELECT *
              FROM filter_templates
              WHERE id = $1 AND (created_by = $2 OR is_public = true)
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
            const { entityType } = event.queryStringParameters || {};
            
            let query = `
              SELECT *
              FROM filter_templates
              WHERE (created_by = $1 OR is_public = true)
            `;
            const params = [user.sub];
            
            if (entityType) {
              query += ` AND entity_type = $${params.length + 1}`;
              params.push(entityType);
            }
            
            query += ` ORDER BY created_at DESC`;
            
            const result = await client.query(query, params);
            
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
            INSERT INTO filter_templates (
              name,
              description,
              filter,
              entity_type,
              is_public,
              created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `, [
            data.name,
            data.description,
            data.filter,
            data.entityType,
            data.isPublic || false,
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
            UPDATE filter_templates
            SET 
              name = $1,
              description = $2,
              filter = $3,
              is_public = $4,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $5 AND created_by = $6
            RETURNING *
          `, [
            updateData.name,
            updateData.description,
            updateData.filter,
            updateData.isPublic || false,
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
            DELETE FROM filter_templates
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
    console.error('Error handling filter templates request:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
