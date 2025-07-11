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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
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
      const reportId = pathParts[pathParts.length - 1];
      
      switch (event.httpMethod) {
        case 'GET':
          if (reportId && reportId !== 'saved') {
            // Get specific report
            const result = await client.query(`
              SELECT 
                r.*,
                (
                  SELECT json_build_object(
                    'id', rr.id,
                    'parameters', rr.parameters,
                    'created_at', rr.created_at
                  )
                  FROM report_results rr
                  WHERE rr.report_id = r.id
                  ORDER BY rr.created_at DESC
                  LIMIT 1
                ) as last_result
              FROM saved_reports r
              WHERE r.id = $1 AND r.created_by = $2
            `, [reportId, user.sub]);
            
            if (result.rows.length === 0) {
              return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Report not found' })
              };
            }
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(result.rows[0])
            };
          } else {
            // List all saved reports
            const { type, favorite } = event.queryStringParameters || {};
            
            let query = `
              SELECT 
                r.*,
                (
                  SELECT json_build_object(
                    'id', rr.id,
                    'parameters', rr.parameters,
                    'created_at', rr.created_at
                  )
                  FROM report_results rr
                  WHERE rr.report_id = r.id
                  ORDER BY rr.created_at DESC
                  LIMIT 1
                ) as last_result
              FROM saved_reports r
              WHERE r.created_by = $1
            `;
            const params = [user.sub];
            
            if (type) {
              query += ` AND r.type = $${params.length + 1}`;
              params.push(type);
            }
            
            if (favorite === 'true') {
              query += ` AND r.favorite = true`;
            }
            
            query += ` ORDER BY r.favorite DESC, r.created_at DESC`;
            
            const result = await client.query(query, params);
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(result.rows)
            };
          }
          
        case 'POST':
          // Create new saved report
          const data = JSON.parse(event.body);
          
          const result = await client.query(`
            INSERT INTO saved_reports (
              title,
              description,
              type,
              config,
              is_template,
              created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `, [
            data.title,
            data.description,
            data.type,
            data.config,
            data.isTemplate || false,
            user.sub
          ]);
          
          return {
            statusCode: 201,
            headers,
            body: JSON.stringify(result.rows[0])
          };
          
        case 'PUT':
          // Update saved report
          const updateData = JSON.parse(event.body);
          
          const updateResult = await client.query(`
            UPDATE saved_reports
            SET 
              title = $1,
              description = $2,
              config = $3,
              is_template = $4,
              updated_by = $5,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $6 AND created_by = $7
            RETURNING *
          `, [
            updateData.title,
            updateData.description,
            updateData.config,
            updateData.isTemplate || false,
            user.sub,
            reportId,
            user.sub
          ]);
          
          if (updateResult.rows.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Report not found' })
            };
          }
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(updateResult.rows[0])
          };
          
        case 'DELETE':
          // Delete saved report
          await client.query(`
            DELETE FROM saved_reports
            WHERE id = $1 AND created_by = $2
          `, [reportId, user.sub]);
          
          return {
            statusCode: 204,
            headers,
            body: ''
          };
          
        case 'PATCH':
          // Update report favorite status
          const { favorite } = JSON.parse(event.body);
          
          const patchResult = await client.query(`
            UPDATE saved_reports
            SET 
              favorite = $1,
              updated_by = $2,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 AND created_by = $4
            RETURNING *
          `, [
            favorite,
            user.sub,
            reportId,
            user.sub
          ]);
          
          if (patchResult.rows.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Report not found' })
            };
          }
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(patchResult.rows[0])
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
    console.error('Error handling saved reports request:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
