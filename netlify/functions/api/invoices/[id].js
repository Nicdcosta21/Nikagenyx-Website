const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const { Readable } = require('stream');

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

// GET, UPDATE, DELETE a single invoice by ID
exports.handler = async (event, context) => {
  // Extract invoice ID from path
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
        // Check if requesting PDF
        if (event.queryStringParameters && event.queryStringParameters.format === 'pdf') {
          return await generateInvoicePdf(id, client);
        }
        
        // Fetch invoice details
        const invoiceResult = await client.query(`
          SELECT 
            i.id, 
            i.invoice_number as "invoiceNumber", 
            i.invoice_type as "invoiceType",
            i.status,
            i.date, 
            i.due_date as "dueDate", 
            i.party_name as "partyName",
            i.party_gstin as "partyGstin",
            i.party_address as "partyAddress",
            i.party_email as "partyEmail",
            i.party_phone as "partyPhone",
            i.subtotal,
            i.gst_total as "gstTotal",
            i.total,
            i.notes,
            i.terms,
            i.created_at as "createdAt",
            i.updated_at as "updatedAt",
            u1.name as "createdBy",
            u2.name as "updatedBy"
          FROM 
            invoices i
          LEFT JOIN 
            users u1 ON i.created_by = u1.id
          LEFT JOIN 
            users u2 ON i.updated_by = u2.id
          WHERE 
            i.id = $1
        `, [id]);
        
        if (invoiceResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Invoice not found' })
          };
        }
        
        // Fetch the invoice items
        const itemsResult = await client.query(`
          SELECT 
            ii.id,
            ii.description,
            ii.quantity,
            ii.unit_price as "unitPrice",
            ii.discount_percent as "discountPercent",
            ii.tax_rate as "taxRate",
            ii.tax_amount as "taxAmount",
            ii.amount,
            ii.account_id as "accountId",
            a.code as "accountCode",
            a.name as "accountName"
          FROM 
            invoice_items ii
          LEFT JOIN
            accounts a ON ii.account_id = a.id
          WHERE 
            ii.invoice_id = $1
          ORDER BY
            ii.id
        `, [id]);
        
        // Combine the results
        const invoice = {
          ...invoiceResult.rows[0],
          items: itemsResult.rows
        };
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoice)
        };
        
      case 'PUT':
        // Update invoice status only
        if (event.queryStringParameters && event.queryStringParameters.action === 'update-status') {
          const { status } = JSON.parse(event.body);
          const user = verifyToken(event.headers.authorization);
          
          if (!['draft', 'sent', 'paid', 'voided'].includes(status)) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ error: 'Invalid status value' })
            };
          }
          
          await client.query(`
            UPDATE invoices
            SET 
              status = $1,
              updated_by = $2,
              updated_at = NOW()
            WHERE id = $3
          `, [status, user.sub, id]);
          
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              message: 'Invoice status updated successfully',
              id
            })
          };
        }
      
        // Full invoice update
        const data = JSON.parse(event.body);
        const user = verifyToken(event.headers.authorization);
        
        // Start a transaction
        await client.query('BEGIN');
        
        try {
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
          
          // Update the invoice header
          await client.query(`
            UPDATE invoices
            SET 
              invoice_number = $1,
              invoice_type = $2,
              status = $3,
              date = $4,
              due_date = $5,
              party_name = $6,
              party_gstin = $7,
              party_address = $8,
              party_email = $9,
              party_phone = $10,
              subtotal = $11,
              gst_total = $12,
              total = $13,
              notes = $14,
              terms = $15,
              updated_by = $16,
              updated_at = NOW()
            WHERE id = $17
          `, [
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
            user.sub,
            id
          ]);
          
          // Delete existing items
          await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
          
          // Insert new items
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
                id,
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
          
          // Commit the transaction
          await client.query('COMMIT');
          
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              message: 'Invoice updated successfully',
              id
            })
          };
        } catch (error) {
          // Rollback the transaction in case of error
          await client.query('ROLLBACK');
          throw error;
        }
        
      case 'DELETE':
        const user = verifyToken(event.headers.authorization);
        
        // Start a transaction
        await client.query('BEGIN');
        
        try {
          // Delete invoice items first (due to foreign key constraints)
          await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
          
          // Delete the invoice
          await client.query('DELETE FROM invoices WHERE id = $1', [id]);
          
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
              'invoice',
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
            body: JSON.stringify({ message: 'Invoice deleted successfully' })
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
    console.error(`Error handling invoice ID ${id}:`, error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  } finally {
    client.release();
  }
};

// Function to generate PDF invoice
async function generateInvoicePdf(invoiceId, client) {
  try {
    // Fetch the invoice data
    const invoiceResult = await client.query(`
      SELECT 
        i.id, 
        i.invoice_number as "invoiceNumber", 
        i.invoice_type as "invoiceType",
        i.status,
        i.date, 
        i.due_date as "dueDate", 
        i.party_name as "partyName",
        i.party_gstin as "partyGstin",
        i.party_address as "partyAddress",
        i.party_email as "partyEmail",
        i.party_phone as "partyPhone",
        i.subtotal,
        i.gst_total as "gstTotal",
        i.total,
        i.notes,
        i.terms
      FROM 
        invoices i
      WHERE 
        i.id = $1
    `, [invoiceId]);
    
    if (invoiceResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invoice not found' })
      };
    }
    
    // Fetch the invoice items
    const itemsResult = await client.query(`
      SELECT 
        ii.description,
        ii.quantity,
        ii.unit_price as "unitPrice",
        ii.discount_percent as "discountPercent",
        ii.tax_rate as "taxRate",
        ii.tax_amount as "taxAmount",
        ii.amount
      FROM 
        invoice_items ii
      WHERE 
        ii.invoice_id = $1
      ORDER BY
        ii.id
    `, [invoiceId]);
    
    // Combine the results
    const invoice = {
      ...invoiceResult.rows[0],
      items: itemsResult.rows
    };
    
    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Company details
    const companyDetails = {
      name: 'Nikagenyx',
      gstin: '29AADCB2230M1ZT',
      address: '123 Main Street, Bangalore, Karnataka 560001',
      email: 'accounts@nikagenyx.com',
      phone: '+91 98765 43210'
    };
    
    // Collect PDF content
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    
    // Add company details at top
    doc.fontSize(20).font('Helvetica-Bold').text(companyDetails.name);
    doc.fontSize(10).font('Helvetica').text(`GSTIN: ${companyDetails.gstin}`);
    doc.text(companyDetails.address);
    doc.text(`Email: ${companyDetails.email}`);
    doc.text(`Phone: ${companyDetails.phone}`);
    
    // Add invoice title
    doc.moveDown();
    doc.fontSize(16).font('Helvetica-Bold').text(
      invoice.invoiceType === 'sale' ? 'TAX INVOICE' : 'PURCHASE INVOICE',
      { align: 'center' }
    );
    
    // Add invoice details
    doc.moveDown();
    doc.fontSize(11).font('Helvetica-Bold').text('Invoice Details:', { continued: true });
    doc.fontSize(11).font('Helvetica').text(`  #${invoice.invoiceNumber}`, { align: 'left' });
    doc.fontSize(11).font('Helvetica-Bold').text('Date:', { continued: true });
    doc.fontSize(11).font('Helvetica').text(`  ${new Date(invoice.date).toLocaleDateString()}`, { align: 'left' });
    doc.fontSize(11).font('Helvetica-Bold').text('Due Date:', { continued: true });
    doc.fontSize(11).font('Helvetica').text(`  ${new Date(invoice.dueDate).toLocaleDateString()}`, { align: 'left' });
    doc.fontSize(11).font('Helvetica-Bold').text('Status:', { continued: true });
    doc.fontSize(11).font('Helvetica').text(`  ${invoice.status.toUpperCase()}`, { align: 'left' });
    
    // Add party details
    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').text('Bill To:');
    doc.fontSize(11).font('Helvetica').text(invoice.partyName);
    if (invoice.partyGstin) doc.text(`GSTIN: ${invoice.partyGstin}`);
    if (invoice.partyAddress) doc.text(invoice.partyAddress);
    if (invoice.partyEmail) doc.text(`Email: ${invoice.partyEmail}`);
    if (invoice.partyPhone) doc.text(`Phone: ${invoice.partyPhone}`);
    
    // Add items table
    doc.moveDown();
    const tableTop = doc.y + 20;
    const tableHeaders = ['Item & Description', 'Qty', 'Rate', 'GST %', 'GST Amt', 'Amount'];
    const tableData = invoice.items.map(item => [
      item.description,
      item.quantity,
      parseFloat(item.unitPrice).toFixed(2),
      `${item.taxRate}%`,
      parseFloat(item.taxAmount).toFixed(2),
      parseFloat(item.amount).toFixed(2)
    ]);
    
    // Draw table header
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(tableHeaders[0], 50, tableTop, { width: 180 });
    doc.text(tableHeaders[1], 230, tableTop, { width: 60 });
    doc.text(tableHeaders[2], 290, tableTop, { width: 80 });
    doc.text(tableHeaders[3], 370, tableTop, { width: 60 });
    doc.text(tableHeaders[4], 430, tableTop, { width: 60 });
    doc.text(tableHeaders[5], 490, tableTop, { width: 60 });
    
    // Draw table rows
    doc.fontSize(10).font('Helvetica');
    let y = tableTop + 20;
    for (const row of tableData) {
      doc.text(row[0], 50, y, { width: 180 });
      doc.text(row[1].toString(), 230, y, { width: 60 });
      doc.text(row[2].toString(), 290, y, { width: 80 });
      doc.text(row[3].toString(), 370, y, { width: 60 });
      doc.text(row[4].toString(), 430, y, { width: 60 });
      doc.text(row[5].toString(), 490, y, { width: 60 });
      y += 20;
    }
    
    // Add table border
    doc.rect(50, tableTop - 10, 500, 0.5).stroke();
    doc.rect(50, y, 500, 0.5).stroke();
    
    // Add totals
    doc.moveDown();
    doc.fontSize(10).font('Helvetica-Bold').text('Subtotal:', 400, y + 20);
    doc.fontSize(10).font('Helvetica').text(parseFloat(invoice.subtotal).toFixed(2), 490, y + 20, { width: 60 });
    doc.fontSize(10).font('Helvetica-Bold').text('GST Total:', 400, y + 40);
    doc.fontSize(10).font('Helvetica').text(parseFloat(invoice.gstTotal).toFixed(2), 490, y + 40, { width: 60 });
    doc.fontSize(10).font('Helvetica-Bold').text('Total:', 400, y + 60);
    doc.fontSize(10).font('Helvetica-Bold').text(parseFloat(invoice.total).toFixed(2), 490, y + 60, { width: 60 });
    
   // Add notes and terms
    y += 100;
    if (invoice.notes) {
      doc.fontSize(11).font('Helvetica-Bold').text('Notes:', 50, y);
      doc.fontSize(10).font('Helvetica').text(invoice.notes, 50, y + 20);
      y += 60;
    }
    
    if (invoice.terms) {
      doc.fontSize(11).font('Helvetica-Bold').text('Terms & Conditions:', 50, y);
      doc.fontSize(10).font('Helvetica').text(invoice.terms, 50, y + 20);
    }
    
    // Add payment details
    doc.fontSize(11).font('Helvetica-Bold').text('Payment Details:', 300, y);
    doc.fontSize(10).font('Helvetica').text('Account Name: Nikagenyx', 300, y + 20);
    doc.fontSize(10).font('Helvetica').text('Account #: 12345678901', 300, y + 40);
    doc.fontSize(10).font('Helvetica').text('IFSC: HDFC0001234', 300, y + 60);
    doc.fontSize(10).font('Helvetica').text('Bank: HDFC Bank', 300, y + 80);
    
    // Finalize PDF
    doc.end();
    
    return new Promise(resolve => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        
        resolve({
          statusCode: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`
          },
          body: pdfBuffer.toString('base64'),
          isBase64Encoded: true
        });
      });
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to generate PDF' })
    };
  }
}
