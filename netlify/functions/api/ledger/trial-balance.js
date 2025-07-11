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

// Get trial balance
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
    
    // Connect to database
    const client = await pool.connect();
    
    try {
      const query = `
        WITH AccountBalances AS (
          SELECT
            a.id AS account_id,
            a.code AS account_code,
            a.name AS account_name,
            a.type AS account_type,
            a.subtype AS account_subtype,
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
                jei.account_id = a.id AND je.date <= $2 AND je.status = 'posted'
            ), 0) AS balance
          FROM 
            accounts a
          WHERE
            a.is_active = true
        )
        
        SELECT
          ab.account_id,
          ab.account_code,
          ab.account_name,
          ab.account_type,
          ab.account_subtype,
          CASE 
            WHEN ab.balance > 0 AND ab.account_type IN ('Asset', 'Expense') THEN ab.balance
            WHEN ab.balance < 0 AND ab.account_type IN ('Liability', 'Equity', 'Revenue') THEN -ab.balance
            ELSE 0
          END AS debit_balance,
          CASE 
            WHEN ab.balance < 0 AND ab.account_type IN ('Asset', 'Expense') THEN -ab.balance
            WHEN ab.balance > 0 AND ab.account_type IN ('Liability', 'Equity', 'Revenue') THEN ab.balance
            ELSE 0
          END
