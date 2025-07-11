const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { calculateNextRunTime } = require('../../utils/scheduleUtils');

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
      const scheduleId = pathParts[pathParts.length - 1];
      
      switch (event.httpMethod) {
        case 'GET':
          if (scheduleId && scheduleId !== 'schedules') {
            // Get specific schedule
            const result = await client.query(`
              SELECT 
                s.*,
                (
                  SELECT json_build_object(
                    'id', r.id,
                    'status', r.status,
                    'start_time', r.start_time,
                    'end_time', r.end_time,
                    'output_url', r.output_url,
                    'error_message', r.error_message
                  )
                  FROM schedule_runs r
                  WHERE r.schedule_id = s.id
                  ORDER BY r.start_time DESC
                  LIMIT 1
                ) as last_run
              FROM report_schedules s
              WHERE s.id = $1 AND s.created_by = $2
            `, [scheduleId, user.sub]);
            
            if (result.rows.length === 0) {
              return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Schedule not found' })
              };
            }
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(result.rows[0])
            };
          } else {
            // List schedules
            const { status } = event.queryStringParameters || {};
            
            let query = `
              SELECT 
                s.*,
                (
                  SELECT json_build_object(
                    'id', r.id,
                    'status', r.status,
                    'start_time', r.start_time,
                    'end_time', r.end_time,
                    'output_url', r.output_url,
                    'error_message', r.error_message
                  )
                  FROM schedule_runs r
                  WHERE r.schedule_id = s.id
                  ORDER BY r.start_time DESC
                  LIMIT 1
                ) as last_run
              FROM report_schedules s
              WHERE s.created_by = $1
            `;
            const params = [user.sub];
            
            if (status) {
              query += ` AND s.status = $${params.length + 1}`;
              params.push(status);
            }
            
            query += ` ORDER BY s.created_at DESC`;
            
            const result = await client.query(query, params);
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(result.rows)
            };
          }
          
        case 'POST':
          // Create schedule
          const data = JSON.parse(event.body);
          const nextRunAt = calculateNextRunTime(data.schedule);
          
          const result = await client.query(`
            INSERT INTO report_schedules (
              id,
              name,
              report_id,
              frequency,
              schedule_time,
              schedule_days,
              month_day,
              recipients,
              format,
              parameters,
              status,
              next_run_at,
              created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
          `, [
            uuidv4(),
            data.name,
            data.reportId,
            data.schedule.frequency,
            data.schedule.time,
            data.schedule.days || [],
            data.schedule.monthDay,
            data.recipients,
            data.format,
            data.parameters || {},
            'active',
            nextRunAt,
            user.sub
          ]);
          
          return {
            statusCode: 201,
            headers,
            body: JSON.stringify(result.rows[0])
          };
          
        case 'PUT':
          // Update schedule
          const updateData = JSON.parse(event.body);
          const nextRunTime = calculateNextRunTime(updateData.schedule);
          
          const updateResult = await client.query(`
            UPDATE report_schedules
            SET 
              name = $1,
              frequency = $2,
              schedule_time = $3,
              schedule_days = $4,
              month_day = $5,
              recipients = $6,
              format = $7,
              parameters = $8,
              status = $9,
              next_run_at = $10,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $11 AND created_by = $12
            RETURNING *
          `, [
            updateData.name,
            updateData.schedule.frequency,
            updateData.schedule.time,
            updateData.schedule.days || [],
            updateData.schedule.monthDay,
            updateData.recipients,
            updateData.format,
            updateData.parameters || {},
            updateData.status,
            nextRunTime,
            scheduleId,
            user.sub
          ]);
          
          if (updateResult.rows.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Schedule not found' })
            };
          }
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(updateResult.rows[0])
          };
          
        case 'DELETE':
          // Delete schedule
          await client.query(`
            DELETE FROM report_schedules
            WHERE id = $1 AND created_by = $2
          `, [scheduleId, user.sub]);
          
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
    console.error('Error handling schedules request:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
}
