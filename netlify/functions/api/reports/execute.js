const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const { Storage } = require('@google-cloud/storage');
const { generateReport } = require('../../../utils/reportGenerator');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize Google Cloud Storage
const storage = new Storage();
const bucket = storage.bucket(process.env.REPORT_BUCKET);

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Verify token
    const user = verifyToken(event.headers.authorization);
    
    // Parse request body
    const { reportId, parameters, format } = JSON.parse(event.body);
    
    // Connect to database
    const client = await pool.connect();
    
    try {
      // Get report configuration
      const reportResult = await client.query(`
        SELECT *
        FROM saved_reports
        WHERE id = $1 AND created_by = $2
      `, [reportId, user.sub]);
      
      if (reportResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Report not found' })
        };
      }
      
      const report = reportResult.rows[0];
      
      // Generate report
      const { content, metadata } = await generateReport(report, parameters, format);
      
      // Upload to Google Cloud Storage
      const fileName = `reports/${user.sub}/${reportId}/${Date.now()}.${format}`;
      const file = bucket.file(fileName);
      
      await file.save(content, {
        metadata: {
          contentType: metadata.contentType
        }
      });
      
      // Get signed URL
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      });
      
      // Save report result
      const resultResult = await client.query(`
        INSERT INTO report_results (
          report_id,
          parameters,
          results,
          format,
          file_path,
          file_size,
          created_by,
          expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        reportId,
        parameters,
        metadata.results,
        format,
        fileName,
        metadata.fileSize,
        user.sub,
        new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      ]);
      
      // Update report last run time
      await client.query(`
        UPDATE saved_reports
        SET 
          last_run_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [reportId]);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          result: resultResult.rows[0],
          url
        })
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error executing report:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
