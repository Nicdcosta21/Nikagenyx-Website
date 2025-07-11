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

// Get upcoming tax due dates
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET',
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
    
    // Get current date
    const today = new Date();
    
    // Connect to database
    const client = await pool.connect();
    
    try {
      // Get upcoming GST return due dates
      const gstDueDatesResult = await client.query(`
        SELECT 
          id,
          type as "formType", 
          period, 
          due_date as "dueDate", 
          status,
          COALESCE((
            SELECT SUM(total) 
            FROM invoices 
            WHERE date BETWEEN 
              TO_DATE(SUBSTRING(period, 1, 10), 'YYYY-MM-DD') AND 
              TO_DATE(SUBSTRING(period, 14), 'YYYY-MM-DD')
            AND invoice_type = 'sale'
          ), 0) as "estimatedAmount"
        FROM 
          gst_returns
        WHERE 
          due_date >= CURRENT_DATE
          OR (status = 'pending' AND due_date < CURRENT_DATE)
        ORDER BY 
          due_date ASC
        LIMIT 5
      `);
      
      // Get upcoming TDS return due dates
      const tdsDueDatesResult = await client.query(`
        SELECT 
          id,
          form_type as "formType", 
          period, 
          due_date as "dueDate", 
          status,
          COALESCE((
            SELECT SUM(amount) 
            FROM tds_deductions 
            WHERE deduction_date BETWEEN 
              TO_DATE(SUBSTRING(period, 1, 10), 'YYYY-MM-DD') AND 
              TO_DATE(SUBSTRING(period, 14), 'YYYY-MM-DD')
          ), 0) as "estimatedAmount"
        FROM 
          tds_returns
        WHERE 
          due_date >= CURRENT_DATE
          OR (status = 'pending' AND due_date < CURRENT_DATE)
        ORDER BY 
          due_date ASC
        LIMIT 5
      `);
      
      // Format the results
      const gstDueDates = gstDueDatesResult.rows.map(row => ({
        ...row,
        type: 'GST',
        description: `GSTR-${row.formType} Filing due`
      }));
      
      const tdsDueDates = tdsDueDatesResult.rows.map(row => ({
        ...row,
        type: 'TDS',
        description: `${row.formType} Filing due`
      }));
      
      // Combine and sort due dates by date
      const allDueDates = [...gstDueDates, ...tdsDueDates].sort((a, b) => {
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(allDueDates)
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting tax due dates:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
