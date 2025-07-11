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

// Get general ledger entries
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Verify token
    const user = verifyToken(event.headers.authorization);

    // Parse query parameters
    const queryParams = new URLSearchParams(event.queryStringParameters || {});
    const startDate = queryParams.get('startDate');
    const endDate = queryParams.get('endDate');
    const accountId = queryParams.get('accountId');
    const accountType = queryParams.get('accountType');
    
    // Connect to database
    const client = await pool.connect();
    
    try {
      let query = `
        WITH 
        -- Calculate opening balances
        AccountOpeningBalances AS (
          SELECT
            a.id AS account_id,
            a.code AS account_code,
            a.name AS account_name,
            a.type AS account_type,
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
                jei.account_id = a.id AND je.date < $1 AND je.status = 'posted'
            ), 0) AS opening_balance
          FROM 
            accounts a
        )
        
        -- Select all ledger entries with running balance
        SELECT
          jei.id,
          je.id AS journal_entry_id,
          je.entry_number,
          je.date,
          je.description,
          je.reference,
          a.id AS account_id,
          a.code AS account_code,
          a.name AS account_name,
          a.type AS account_type,
          -- Get the contra account (the other side of the entry)
          (
            SELECT contra_a.code 
            FROM journal_entry_items contra_jei
            JOIN accounts contra_a ON contra_jei.account_id = contra_a.id
            WHERE 
              contra_jei.journal_entry_id = je.id AND 
              contra_jei.account_id != jei.account_id
            LIMIT 1
          ) AS contra_account_code,
          (
            SELECT contra_a.name 
            FROM journal_entry_items contra_jei
            JOIN accounts contra_a ON contra_jei.account_id = contra_a.id
            WHERE 
              contra_jei.journal_entry_id = je.id AND 
              contra_jei.account_id != jei.account_id
            LIMIT 1
          ) AS contra_account_name,
          jei.type,
          jei.amount,
          aob.opening_balance,
          (
            aob.opening_balance + 
            SUM(
              CASE 
                WHEN jei2.type = 'debit' AND a.type IN ('Asset', 'Expense') THEN jei2.amount
                WHEN jei2.type = 'credit' AND a.type IN ('Asset', 'Expense') THEN -jei2.amount
                WHEN jei2.type = 'debit' AND a.type IN ('Liability', 'Equity', 'Revenue') THEN -jei2.amount
                WHEN jei2.type = 'credit' AND a.type IN ('Liability', 'Equity', 'Revenue') THEN jei2.amount
              END
            ) OVER (
              PARTITION BY jei.account_id 
              ORDER BY je.date, je.entry_number, jei.id
            )
          ) AS running_balance
        FROM 
          journal_entry_items jei
        JOIN 
          journal_entries je ON jei.journal_entry_id = je.id
        JOIN 
          accounts a ON jei.account_id = a.id
        JOIN 
          AccountOpeningBalances aob ON a.id = aob.account_id
        WHERE 
          je.date BETWEEN $1 AND $2 AND 
          je.status = 'posted'
      `;
      
      const queryParams = [
        startDate || '2000-01-01',
        endDate || new Date().toISOString().split('T')[0]
      ];
      
      let paramCount = 3;
      
      // Add optional filters
      if (accountId && accountId !== 'all') {
        query += ` AND jei.account_id = $${paramCount}`;
        queryParams.push(accountId);
        paramCount++;
      }
      
      if (accountType && accountType !== 'all') {
        query += ` AND a.type = $${paramCount}`;
        queryParams.push(accountType);
        paramCount++;
      }
      
      query += ` ORDER BY a.code, je.date, je.entry_number`;
      
      // Execute query
      const result = await client.query(query, queryParams);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result.rows)
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching ledger entries:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};
