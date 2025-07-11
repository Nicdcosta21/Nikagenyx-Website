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

// Get tax summary for dashboard
exports.handler = async (event, context) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
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
      // First, get the current quarter and financial year
      const now = new Date();
      const currentYear = now.getFullYear();
      let currentQuarter;
      let startDate, endDate;
      
      // Determine current quarter
      const month = now.getMonth() + 1;
      if (month >= 4 && month <= 6) {
        currentQuarter = 'Q1';
        startDate = `${currentYear}-04-01`;
        endDate = `${currentYear}-06-30`;
      } else if (month >= 7 && month <= 9) {
        currentQuarter = 'Q2';
        startDate = `${currentYear}-07-01`;
        endDate = `${currentYear}-09-30`;
      } else if (month >= 10 && month <= 12) {
        currentQuarter = 'Q3';
        startDate = `${currentYear}-10-01`;
        endDate = `${currentYear}-12-31`;
      } else {
        currentQuarter = 'Q4';
        startDate = `${currentYear}-01-01`;
        endDate = `${currentYear}-03-31`;
      }
      
      // Get GST collected (output tax) for current quarter
      const gstCollectedResult = await client.query(`
        SELECT COALESCE(SUM(je.amount), 0) as total
        FROM journal_entries je
        JOIN journal_entry_items jei ON je.id = jei.journal_entry_id
        JOIN accounts a ON jei.account_id = a.id
        WHERE je.date BETWEEN $1 AND $2
        AND a.name = 'GST Output Tax'
        AND jei.type = 'credit'
      `, [startDate, endDate]);
      
      // Get GST paid (input tax) for current quarter
      const gstPaidResult = await client.query(`
        SELECT COALESCE(SUM(je.amount), 0) as total
        FROM journal_entries je
        JOIN journal_entry_items jei ON je.id = jei.journal_entry_id
        JOIN accounts a ON jei.account_id = a.id
        WHERE je.date BETWEEN $1 AND $2
        AND a.name = 'GST Input Tax'
        AND jei.type = 'debit'
      `, [startDate, endDate]);
      
      // Get pending GST returns
      const pendingGstResult = await client.query(`
        SELECT COUNT(*) as count
        FROM gst_returns
        WHERE status = 'pending' OR status = 'overdue'
      `);
      
      // Get TDS deducted for current quarter
      const tdsDeductedResult = await client.query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM tds_deductions
        WHERE deduction_date BETWEEN $1 AND $2
      `, [startDate, endDate]);
      
      // Get TDS paid for current quarter
      const tdsPaidResult = await client.query(`
        SELECT COALESCE(SUM(td.amount), 0) as total
        FROM tds_deductions td
        JOIN tds_payments tp ON td.payment_id = tp.id
        WHERE td.deduction_date BETWEEN $1 AND $2
        AND tp.status = 'paid'
      `, [startDate, endDate]);
      
      // Get pending TDS returns
      const pendingTdsResult = await client.query(`
        SELECT COUNT(*) as count
        FROM tds_returns
        WHERE status = 'pending' OR status = 'overdue'
      `);
      
      // Calculate net GST payable
      const gstCollected = parseFloat(gstCollectedResult.rows[0].total);
      const gstPaid = parseFloat(gstPaidResult.rows[0].total);
      const netGstPayable = Math.max(0, gstCollected - gstPaid);
      
      // Calculate pending TDS payment
      const tdsDeducted = parseFloat(tdsDeductedResult.rows[0].total);
      const tdsPaid = parseFloat(tdsPaidResult.rows[0].total);
      const pendingTdsPayable = Math.max(0, tdsDeducted - tdsPaid);
      
      const taxSummary = {
        gst: {
          collectedTotal: gstCollected,
          paidTotal: gstPaid,
          netPayable: netGstPayable,
          pendingReturns: parseInt(pendingGstResult.rows[0].count)
        },
        tds: {
          deductedTotal: tdsDeducted,
          paidTotal: tdsPaid,
          pendingPayable: pendingTdsPayable,
          pendingReturns: parseInt(pendingTdsResult.rows[0].count)
        },
        currentQuarter,
        financialYear: month <= 3 ? `${currentYear-1}-${currentYear.toString().substr(2)}` : `${currentYear}-${(currentYear+1).toString().substr(2)}`
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(taxSummary)
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting tax summary:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
