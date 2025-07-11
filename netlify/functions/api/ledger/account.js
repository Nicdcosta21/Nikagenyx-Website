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

// Get ledger for a specific account
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Verify token
    const user = verifyToken(event.headers.authorization);

    // Parse query parameters
    const queryParams = new URLSearchParams(event.queryStringParameters || {});
    const accountId = queryParams.get('accountId');
    const startDate = queryParams.get('startDate');
    const endDate = queryParams.get('endDate');
    
    if (!accountId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Account ID is required' })
      };
    }
    
    // Connect to database
    const client = await pool.connect();
    
    try {
      // Calculate opening balance
      const openingBalanceQuery = `
        SELECT
          a.opening_balance +
          COALESCE((
            SELECT 
              SUM(
                CASE 
                  WHEN jei.type = 'debit' AND a.type IN ('Asset', 'Expense') THEN jei.amount
                  WHEN jei.type = 'credit' AND a.type IN ('Asset', 'Expense') THEN -jei.amount
                  WHEN jei.type = 'debit' AND a.type IN ('Liability', 'Equity', 'Revenue') THEN -jei.amount
                  WHEN jei.type = 'credit' AND a.type IN ('Liability', 'Equity', 'Revenue') THEN jei.amount
                END
              )
            FROM 
              journal_entry_items jei
            JOIN 
              journal_entries je ON jei.journal_entry_id = je.id
            WHERE 
              jei.account_id = a.id AND je.date < $2 AND je.status = 'posted'
          ), 0) AS opening_balance
        FROM 
          accounts a
        WHERE 
          a.id = $1
      `;
      
      const openingBalanceResult = await client.query(openingBalanceQuery, [
        accountId,
        startDate || '2000-01-01'
      ]);
      
      const openingBalance = parseFloat(openingBalanceResult.rows[0]?.opening_balance || 0);
      
      // Get ledger entries with running balance
      const ledgerQuery = `
        SELECT
          jei.id,
          je.id AS journal_entry_id,
          je.entry_number,
          je.date,
          je.description,
          je.reference,
          jei.type,
          jei.amount,
          $3 AS opening_balance,
          (
            $3 + 
            SUM(
              CASE 
                WHEN jei.type = 'debit' AND a.type IN ('Asset', 'Expense') THEN jei.amount
                WHEN jei.type = 'credit' AND a.type IN ('Asset', 'Expense') THEN -jei.amount
                WHEN jei.type = 'debit' AND a.type IN ('Liability', 'Equity', 'Revenue') THEN -jei.amount
                WHEN jei.type = 'credit' AND a.type IN ('Liability', 'Equity', 'Revenue') THEN jei.amount
              END
            ) OVER (
              ORDER BY je.date, je.entry_number, jei.id
            )
          ) AS running_balance
        FROM 
          journal_entry_items jei
        JOIN 
          journal_entries je ON jei.journal_entry_id = je.id
        JOIN 
          accounts a ON jei.account_id = a.id
        WHERE 
          jei.account_id = $1 AND
          je.date BETWEEN $2 AND $4 AND
          je.status = 'posted'
        ORDER BY 
          je.date, je.entry_number, jei.id
      `;
      
      const ledgerResult = await client.query(ledgerQuery, [
        accountId,
        startDate || '2000-01-01',
        openingBalance,
        endDate || new Date().toISOString().split('T')[0]
      ]);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ledgerResult.rows)
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching account ledger:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};
