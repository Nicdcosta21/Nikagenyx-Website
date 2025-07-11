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

// Helper function to calculate next run date
const calculateNextRunDate = (schedule) => {
  const now = new Date();
  let nextRun = new Date();
  
  // Parse time components
  const [hours, minutes] = schedule.time.split(':').map(Number);
  nextRun.setHours(hours, minutes, 0, 0);
  
  switch (schedule.frequency) {
    case 'daily':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
      
    case 'weekly':
      const dayOfWeek = parseInt(schedule.day);
      const currentDay = nextRun.getDay();
      const daysUntilNext = (dayOfWeek + 7 - currentDay) % 7;
      nextRun.setDate(nextRun.getDate() + daysUntilNext);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 7);
      }
      break;
      
    case 'monthly':
      nextRun.setDate(parseInt(schedule.day));
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;
      
    case 'quarterly':
      const currentMonth = now.getMonth();
      const currentQuarter = Math.floor(currentMonth / 3);
      const nextQuarterMonth = (currentQuarter * 3 + 3) % 12;
      nextRun.setMonth(nextQuarterMonth);
      nextRun.setDate(parseInt(schedule.day));
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 3);
      }
      break;
  }
  
  return nextRun;
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
      const action = pathParts[pathParts.length - 1];
      
      switch (event.httpMethod) {
        case 'GET':
          if (action.match(/^[0-9a-f-]{36}$/)) {
            // Get a specific scheduled report
            const reportId = action;
            
            const result = await client.query(`
              SELECT *
              FROM scheduled_reports
              WHERE id = $1 AND created_by = $2
            `, [reportId, user.sub]);
            
            if (result.rows.length === 0) {
              return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Scheduled report not found' })
              };
            }
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(result.rows[0])
            };
          } else {
            // Get all scheduled reports
            const result = await client.query(`
              SELECT 
                sr.*,
                cr.title as report_title,
                cr.config as report_config
              FROM scheduled_reports sr
              JOIN custom_reports cr ON sr.report_id = cr.id
              WHERE sr.created_by = $1
              ORDER BY sr.next_run_at ASC
            `, [user.sub]);
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(result.rows)
            };
          }
          
        case 'POST':
          // Create a new scheduled report
          const data = JSON.parse(event.body);
          
          // Calculate next run date
          const nextRunAt = calculateNextRunDate(data.schedule);
          
          const result = await client.query(`
            INSERT INTO scheduled_reports (
              report_id,
              report_name,
              report_type,
              active,
              format,
              recipients,
              schedule,
              email_subject,
              email_body,
              next_run_at,
              created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
          `, [
            data.reportId,
            data.reportName,
            data.reportType,
            data.active,
            data.format,
            data.recipients,
            data.schedule,
            data.emailSubject,
            data.emailBody,
            nextRunAt,
            user.sub
          ]);
          
          return {
            statusCode: 201,
            headers,
            body: JSON.stringify(result.rows[0])
          };
          
        case 'PUT':
          // Update an existing scheduled report
          if (!action.match(/^[0-9a-f-]{36}$/)) {
            throw new Error('Invalid report ID');
          }
          
          const updateData = JSON.parse(event.body);
          
          // Calculate next run date
          const updatedNextRunAt = calculateNextRunDate(updateData.schedule);
          
          const updateResult = await client.query(`
            UPDATE scheduled_reports
            SET 
              report_id = $1,
              report_name = $2,
              report_type = $3,
              active = $4,
              format = $5,
              recipients = $6,
              schedule = $7,
              email_subject = $8,
              email_body = $9,
              next_run_at = $10,
              updated_by = $11,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $12 AND created_by = $13
            RETURNING *
          `, [
            updateData.reportId,
            updateData.reportName,
            updateData.reportType,
            updateData.active,
            updateData.format,
            updateData.recipients,
            updateData.schedule,
            updateData.emailSubject,
            updateData.emailBody,
            updatedNextRunAt,
            user.sub,
            action,
            user.sub
          ]);
          
          if (updateResult.rows.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Scheduled report not found' })
            };
          }
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(updateResult.rows[0])
          };
          
        case 'DELETE':
          // Delete a scheduled report
          if (!action.match(/^[0-9a-f-]{36}$/)) {
            throw new Error('Invalid report ID');
          }
          
          await client.query(`
            DELETE FROM scheduled_reports
            WHERE id = $1 AND created_by = $2
          `, [action, user.sub]);
          
          return {
            statusCode: 204,
            headers,
            body: ''
          };
          
        case 'PATCH':
          // Toggle report status
          if (action === 'status') {
            const { id, active } = JSON.parse(event.body);
            
            const statusResult = await client.query(`
              UPDATE scheduled_reports
              SET 
                active = $1,
                updated_by = $2,
                updated_at = CURRENT_TIMESTAMP,
                next_run_at = $3
              WHERE id = $4 AND created_by = $5
              RETURNING *
            `, [
              active,
              user.sub,
              active ? calculateNextRunDate(data.schedule) : null,
              id,
              user.sub
            ]);
            
            if (statusResult.rows.length === 0) {
              return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Scheduled report not found' })
              };
            }
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(statusResult.rows[0])
            };
          }
          
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid action' })
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
    console.error('Error handling scheduled report request:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
