const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

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

// Create a new journal entry
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Verify token
    const user = verifyToken(event.headers.authorization);
    
    // Parse request body
    const data = JSON.parse(event.body);
    
    // Validate required fields
    if (!data.entryNumber || !data.date || !data.status || !data.items || !data.items.length) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Missing required fields. Entry number, date, status, and items are required.' 
        })
      };
    }
    
    // Calculate total debit and credit amounts
    let totalDebit = 0;
    let totalCredit = 0;
    
    data.items.forEach(item => {
      if (item.type === 'debit') {
        totalDebit += parseFloat(item.amount);
      } else {
        totalCredit += parseFloat(item.amount);
      }
    });
    
    // Check if the entry is balanced
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Journal entry must be balanced. Debits must equal credits.' 
        })
      };
    }
    
    // Connect to database
    const client = await pool.connect();
    
    try {
      // Start a transaction
      await client.query('BEGIN');
      
      // Check if entry number already exists
      const checkResult = await client.query('SELECT id FROM journal_entries WHERE entry_number = $1', [data.entryNumber]);
      if (checkResult.rows.length > 0) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Journal entry number already exists' })
        };
      }
      
      // Generate UUID for the journal entry
      const journalId = uuidv4();
      
      // Insert journal entry
      await client.query(`
        INSERT INTO journal_entries (
          id,
          entry_number,
          date,
          description,
          reference,
          status,
          amount,
          created_by,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [
        journalId,
        data.entryNumber,
        data.date,
        data.description || '',
        data.reference || '',
        data.status,
        totalDebit, // Using debit amount as the total amount
        user.sub  // user ID from JWT token
      ]);
      
      // Insert journal entry items
      for (const item of data.items) {
        await client.query(`
          INSERT INTO journal_entry_items (
            id,
            journal_entry_id,
            account_id,
            description,
            type,
            amount
          ) VALUES (
            uuid_generate_v4(),
            $1,
            $2,
            $3,
            $4,
            $5
          )
        `, [
          journalId,
          item.accountId,
          item.description || '',
          item.type,
          parseFloat(item.amount)
        ]);
      }
      
      // Log the creation in audit logs
      await client.query(`
        INSERT INTO audit_logs (
          id, 
          user_id, 
          action, 
          entity_type, 
          entity_id, 
          changes,
          ip_address,
          created_at
        ) VALUES (
          uuid_generate_v4(),
          $1,
          'create',
          'journal_entry',
          $2,
          $3,
          $4,
          NOW()
        )
      `, [
        user.sub,
        journalId,
        JSON.stringify(data),
        event.headers['client-ip'] || ''
      ]);
      
      // Commit the transaction
      await client.query('COMMIT');
      
      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: journalId,
          message: 'Journal entry created successfully' 
        })
      };
    } catch (error) {
      // Rollback the transaction in case of error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating journal entry:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
