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

// Get tax calendar events
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
    
    // Get month and year from query parameters
    const queryParams = event.queryStringParameters || {};
    const month = parseInt(queryParams.month) || new Date().getMonth() + 1; // 1-12
    const year = parseInt(queryParams.year) || new Date().getFullYear();
    
    // Date range for the requested month
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
    
    // Connect to database
    const client = await pool.connect();
    
    try {
      // Get GST events for the month
      const gstEventsResult = await client.query(`
        SELECT
          id,
          type as "formType",
          due_date as date,
          'GST' as type,
          CASE 
            WHEN type = '1' THEN 'GSTR-1 Filing due'
            WHEN type = '2' THEN 'GSTR-2 Filing due'
            WHEN type = '3B' THEN 'GSTR-3B Filing due'
            ELSE 'GST Return Filing due'
          END as description
        FROM
          gst_returns
        WHERE
          due_date BETWEEN $1 AND $2
      `, [startDate, endDate]);
      
      // Get TDS events for the month
      const tdsEventsResult = await client.query(`
        SELECT
          id,
          form_type as "formType",
          due_date as date,
          'TDS' as type,
          form_type || ' Filing due' as description
        FROM
          tds_returns
        WHERE
          due_date BETWEEN $1 AND $2
      `, [startDate, endDate]);
      
      // Combine events
      const events = [
        ...gstEventsResult.rows,
        ...tdsEventsResult.rows
      ];
      
      // Add hard-coded events for common tax dates
      // These are standard Indian tax dates that don't change
      
      // GST Payment due date (20th of every month for previous month)
      if (month === 1) {
        // December GST payment due in January
        events.push({
          date: `${year}-01-20`,
          type: 'GST',
          description: 'GST Payment for December',
          formType: 'payment'
        });
      } else {
        // Previous month's GST payment
        const prevMonth = month - 1;
        const prevMonthName = new Date(year, prevMonth - 1, 1).toLocaleString('default', { month: 'long' });
        
        events.push({
          date: `${year}-${month.toString().padStart(2, '0')}-20`,
          type: 'GST',
          description: `GST Payment for ${prevMonthName}`,
          formType: 'payment'
        });
      }
      
      // TDS Payment (7th of every month for previous month)
      if (month === 1) {
        // December TDS payment due in January
        events.push({
          date: `${year}-01-07`,
          type: 'TDS',
          description: 'TDS Payment for December',
          formType: 'payment'
        });
      } else {
        // Previous month's TDS payment
        const prevMonth = month - 1;
        const prevMonthName = new Date(year, prevMonth - 1, 1).toLocaleString('default', { month: 'long' });
        
        events.push({
          date: `${year}-${month.toString().padStart(2, '0')}-07`,
          type: 'TDS',
          description: `TDS Payment for ${prevMonthName}`,
          formType: 'payment'
        });
      }
      
      // Quarterly TDS return due dates
      if (month === 7 && year) {
        // TDS return for Apr-Jun due by 31st July
        events.push({
          date: `${year}-07-31`,
          type: 'TDS',
          description: 'Quarterly TDS Return (Apr-Jun)',
          formType: 'return'
        });
      } else if (month === 10 && year) {
        // TDS return for Jul-Sep due by 31st October
        events.push({
          date: `${year}-10-31`,
          type: 'TDS',
          description: 'Quarterly TDS Return (Jul-Sep)',
          formType: 'return'
        });
      } else if (month === 1 && year) {
        // TDS return for Oct-Dec due by 31st January
        events.push({
          date: `${year}-01-31`,
          type: 'TDS',
          description: 'Quarterly TDS Return (Oct-Dec)',
          formType: 'return'
        });
      } else if (month === 5 && year) {
        // TDS return for Jan-Mar due by 31st May
        events.push({
          date: `${year}-05-31`,
          type: 'TDS',
          description: 'Quarterly TDS Return (Jan-Mar)',
          formType: 'return'
        });
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(events)
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting tax calendar events:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
