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

// GET, UPDATE, DELETE a journal entry by ID
exports.handler = async (event, context) => {
  // Extract journal entry ID from path
  const id = event.path.split('/').pop();
  
  // Verify token for all operations
  try {
    const user = verifyToken(event.headers.authorization);
  } catch (error) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }

  // Connect to database
  const client = await pool.connect();
  
  try {
    // Handle different HTTP methods
    switch (event.httpMethod) {
      case 'GET':
        // Fetch journal entry details
        const entryResult = await client.query(`
          SELECT 
            je.id, 
            je.entry_number as "entryNumber", 
            je.date, 
            je.description, 
            je.reference, 
            je.status,
            je.amount as "totalAmount",
            (
              SELECT SUM(jei.amount) 
              FROM journal_entry_items jei 
              WHERE jei.journal_entry_id = je.id AND jei.type = 'debit'
            ) as "totalDebit",
            (
              SELECT SUM(jei.amount) 
              FROM journal_entry_items jei 
              WHERE jei.journal_entry_id = je.id AND jei.type = 'credit'
            ) as "totalCredit",
            je.created_at as "createdAt",
            je.updated_at as "updatedAt",
            u1.name as "createdBy",
            u2.name as "updatedBy"
          FROM 
            journal_entries je
          LEFT JOIN 
            users u1 ON je.created_by = u1.id
          LEFT JOIN 
            users u2 ON je.updated_by = u2.id
          WHERE 
            je.id = $1
        `, [id]);
        
        if (entryResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Journal entry not found' })
          };
        }
        
        // Fetch the journal entry items
        const itemsResult = await client.query(`
          SELECT 
            jei.id,
            jei.account_id as "accountId",
            a.code as "accountCode",
            a.name as "accountName",
            jei.description,
            jei.type,
            jei.amount
          FROM 
            journal_entry_items jei
          JOIN
            accounts a ON jei.account_id = a.id
          WHERE 
            jei.journal_entry_id = $1
          ORDER BY
            jei.id
        `, [id]);
        
        // Combine the results
        const journalEntry = {
          ...entryResult.rows[0],
          items: itemsResult
