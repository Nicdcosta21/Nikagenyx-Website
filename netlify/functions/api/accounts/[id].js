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

// GET, UPDATE, DELETE a single account by ID
exports.handler = async (event, context) => {
  // Extract account ID from path
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
        // Fetch account details
        const getResult = await client.query(`
          SELECT 
            a.id, 
            a.code, 
            a.name, 
            a.description, 
            a.type, 
            a.subtype, 
            a.is_active, 
            a.parent_id, 
            a.tax_rate,
            a.opening_balance,
            COALESCE(
              (SELECT SUM(CASE WHEN je.debit_account_id = a.id THEN je.amount ELSE -je.amount END) 
               FROM journal_entries je 
               WHERE je.debit_account_id = a.id OR je.credit_account_id = a.id),
              0
            ) + a.opening_balance AS balance,
            p.name AS parent_name,
            p.code AS parent_code
          FROM 
            accounts a
          LEFT JOIN 
            accounts p ON a.parent_id = p.id
          WHERE 
            a.id = $1
        `, [id]);
        
        if (getResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Account not found' })
          };
        }
        
        const account = {
          id: getResult.rows[0].id,
          code: getResult.rows[0].code,
          name: getResult.rows[0].name,
          description: getResult.rows[0].description,
          type: getResult.rows[0].type,
          subtype: getResult.rows[0].subtype,
          isActive: getResult.rows[0].is_active,
          parentId: getResult.rows[0].parent_id,
          parentName: getResult.rows[0].parent_name,
          parentCode: getResult.rows[0].parent_code,
          taxRate: getResult.rows[0].tax_rate,
          openingBalance: parseFloat(getResult.rows[0].opening_balance),
          balance: parseFloat(getResult.rows[0].balance)
        };
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(account)
        };
        
      case 'PUT':
        // Update account
        const data = JSON.parse(event.body);
        
        // Validate required fields
        if (!data.code || !data.name || !data.type) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Code, name, and type are required fields' })
          };
        }
        
        // Perform update
        await client.query(`
          UPDATE accounts
          SET 
            code = $1, 
            name = $2, 
            description = $3, 
            type = $4, 
            subtype = $5, 
            is_active = $6, 
            parent_id = $7, 
            tax_rate = $8,
            opening_balance = $9,
            updated_at = NOW()
          WHERE id = $10
        `, [
          data.code,
          data.name,
          data.description || '',
          data.type,
          data.subtype || null,
          data.isActive !== false,
          data.parentId || null,
          data.taxRate || 0,
          data.openingBalance || 0,
          id
        ]);
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Account updated successfully' })
        };
        
      case 'DELETE':
        // Check if account has transactions
        const checkResult = await client.query(`
          SELECT COUNT(*) AS count 
          FROM journal_entries 
          WHERE debit_account_id = $1 OR credit_account_id = $1
        `, [id]);
        
        if (parseInt(checkResult.rows[0].count) > 0) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Cannot delete account with existing transactions' })
          };
        }
        
        // Check if account has child accounts
        const childResult = await client.query(`
          SELECT COUNT(*) AS count 
          FROM accounts 
          WHERE parent_id = $1
        `, [id]);
        
        if (parseInt(childResult.rows[0].count) > 0) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Cannot delete account with child accounts' })
          };
        }
        
        // Delete the account
        await client.query('DELETE FROM accounts WHERE id = $1', [id]);
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Account deleted successfully' })
        };
        
      default:
        return { 
          statusCode: 405, 
          body: 'Method Not Allowed' 
        };
    }
  } catch (error) {
    console.error(`Error handling account ID ${id}:`, error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  } finally {
    client.release();
  }
};
