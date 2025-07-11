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

// Create a new invoice
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
    if (!data.invoiceNumber || !data.invoiceType || !data.status || !data.date || !data.dueDate || !data.partyName) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Missing required fields. Invoice number, type, status, dates and party name are required.' 
        })
      };
    }
    
    // Connect to database
    const client = await pool.connect();
    
    try {
      // Start a transaction
      await client.query('BEGIN');
      
      // Check if invoice number already exists
      const checkResult = await client.query('SELECT id FROM invoices WHERE invoice_number = $1', [data.invoiceNumber]);
      if (checkResult.rows.length > 0) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invoice number already exists' })
        };
      }
      
      // Generate UUID for the invoice
      const invoiceId = uuidv4();
      
      // Insert invoice
      await client.query(`
        INSERT INTO invoices (
          id,
          invoice_number,
          invoice_type,
          status,
          date,
          due_date,
          party_name,
          party_gstin,
          party_address,
          party_email,
          party_phone,
          subtotal,
          gst_total,
          total,
          notes,
          terms,
          created_by,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
      `, [
        invoiceId,
        data.invoiceNumber,
        data.invoiceType,
        data.status,
        data.date,
        data.dueDate,
        data.partyName,
        data.partyGstin || null,
        data.partyAddress || null,
        data.partyEmail || null,
        data.partyPhone || null,
        data.subtotal,
        data.gstTotal,
        data.total,
        data.notes || null,
        data.terms || null,
        user.sub  // user ID from JWT token
      ]);
      
      // Insert invoice items
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          await client.query(`
            INSERT INTO invoice_items (
              id,
              invoice_id,
              description,
              quantity,
              unit_price,
              discount_percent,
              tax_rate,
              tax_amount,
              amount,
              account_id
            ) VALUES (
              uuid_generate_v4(),
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9
            )
          `, [
            invoiceId,
            item.description,
            item.quantity,
            item.unitPrice,
            item.discountPercent || 0,
            item.taxRate || 0,
            item.taxAmount || 0,
            item.amount,
            item.accountId || null
          ]);
        }
      }
      
      // Create corresponding journal entry if the invoice is not in draft status
      if (data.status !== 'draft' && data.autoCreateJournalEntry) {
        const journalEntryId = uuidv4();
        const entryDate = new Date(data.date).toISOString().split('T')[0];
        const entryNumber = data.invoiceType === 'sale' ? 
          `JE-SALE-${data.invoiceNumber.split('-').pop()}` : 
          `JE-PURCH-${data.invoiceNumber.split('-').pop()}`;
        
        // Create journal entry header
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
          journalEntryId,
          entryNumber,
          entryDate,
          `${data.invoiceType === 'sale' ? 'Sales' : 'Purchase'} Invoice ${data.invoiceNumber} for ${data.partyName}`,
          data.invoiceNumber,
          'posted',
          data.total,
          user.sub
        ]);
        
        // Create journal entry items based on invoice type
        if (data.invoiceType === 'sale') {
          // For sales invoice: Debit Accounts Receivable, Credit Sales Accounts
          
          // 1. Accounts Receivable entry
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
              $2,  -- Accounts Receivable account ID (would come from settings)
              $3,
              'debit',
              $4
            )
          `, [
            journalEntryId,
            process.env.ACCOUNTS_RECEIVABLE_ID || '00000000-0000-0000-0000-000000000000', // Default AR account
            `Invoice ${data.invoiceNumber} - ${data.partyName}`,
            data.total
          ]);
          
          // 2. Sales account entries (for each line item with different account)
          const groupedItems = {};
          for (const item of data.items) {
            const accountId = item.accountId || process.env.DEFAULT_SALES_ACCOUNT_ID;
            if (!groupedItems[accountId]) {
              groupedItems[accountId] = 0;
            }
            groupedItems[accountId] += parseFloat(item.amount);
          }
          
          for (const [accountId, amount] of Object.entries(groupedItems)) {
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
                'credit',
                $4
              )
            `, [
              journalEntryId,
              accountId,
              `Sales - Invoice ${data.invoiceNumber}`,
              amount
            ]);
          }
          
        } else {
          // For purchase invoice: Debit Expense Accounts, Credit Accounts Payable
          
          // 1. Expense account entries (for each line item with different account)
          const groupedItems = {};
          for (const item of data.items) {
            const accountId = item.accountId || process.env.DEFAULT_EXPENSE_ACCOUNT_ID;
            if (!groupedItems[accountId]) {
              groupedItems[accountId] = 0;
            }
            groupedItems[accountId] += parseFloat(item.amount);
          }
          
          for (const [accountId, amount] of Object.entries(groupedItems)) {
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
                'debit',
                $4
              )
            `, [
              journalEntryId,
              accountId,
              `Purchase - Invoice ${data.invoiceNumber}`,
              amount
            ]);
          }
          
          // 2. Accounts Payable entry
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
              $2,  -- Accounts Payable account ID (would come from settings)
              $3,
              'credit',
              $4
            )
          `, [
            journalEntryId,
            process.env.ACCOUNTS_PAYABLE_ID || '00000000-0000-0000-0000-000000000000', // Default AP account
            `Invoice ${data.invoiceNumber} - ${data.partyName}`,
            data.total
          ]);
        }
      }
      
      // Update invoice settings to increment invoice number
      if (data.updateNextNumber) {
        const settingsKey = data.invoiceType === 'sale' ? 'next_invoice_number' : 'next_purchase_number';
        await client.query(`
          UPDATE settings
          SET value = (CAST(value AS INTEGER) + 1)::TEXT
          WHERE key = $1
        `, [settingsKey]);
      }
      
      // Commit the transaction
      await client.query('COMMIT');
      
      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: invoiceId,
          message: 'Invoice created successfully' 
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
    console.error('Error creating invoice:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
