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
          items: itemsResult.rows
        };
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(journalEntry)
        };
        
      case 'PUT':
        // Update journal entry
        const data = JSON.parse(event.body);
        const user = verifyToken(event.headers.authorization);
        
        // Start a transaction
        await client.query('BEGIN');
        
        try {
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
          
          // Update the journal entry
          await client.query(`
            UPDATE journal_entries
            SET 
              entry_number = $1,
              date = $2,
              description = $3,
              reference = $4,
              status = $5,
              amount = $6,
              updated_by = $7,
              updated_at = NOW()
            WHERE id = $8
          `, [
            data.entryNumber,
            data.date,
            data.description || '',
            data.reference || '',
            data.status,
            totalDebit, // Using debit amount as the total amount
            user.sub,
            id
          ]);
          
          // Delete existing items
          await client.query('DELETE FROM journal_entry_items WHERE journal_entry_id = $1', [id]);
          
          // Insert new items
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
              id,
              item.accountId,
              item.description || '',
              item.type,
              parseFloat(item.amount)
            ]);
          }
          
          // Commit the transaction
          await client.query('COMMIT');
          
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              message: 'Journal entry updated successfully',
              id
            })
          };
        } catch (error) {
          // Rollback the transaction in case of error
          await client.query('ROLLBACK');
          throw error;
        }
        
      case 'DELETE':
        // Check if the journal entry can be deleted (e.g., not referenced by other records)
        const user = verifyToken(event.headers.authorization);
        
        // Start a transaction
        await client.query('BEGIN');
        
        try {
          // Delete journal entry items first (due to foreign key constraints)
          await client.query('DELETE FROM journal_entry_items WHERE journal_entry_id = $1', [id]);
          
          // Delete the journal entry
          await client.query('DELETE FROM journal_entries WHERE id = $1', [id]);
          
          // Log the deletion in audit logs
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
              'delete',
              'journal_entry',
              $2,
              $3,
              $4,
              NOW()
            )
          `, [
            user.sub,
            id,
            JSON.stringify({ id }),
            event.headers['client-ip'] || ''
          ]);
          
          // Commit the transaction
          await client.query('COMMIT');
          
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Journal entry deleted successfully' })
          };
        } catch (error) {
          // Rollback the transaction in case of error
          await client.query('ROLLBACK');
          throw error;
        }
        
      default:
        return { 
          statusCode: 405, 
          body: 'Method Not Allowed' 
        };
    }
  } catch (error) {
    console.error(`Error handling journal entry ID ${id}:`, error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  } finally {
    client.release();
  }
};
