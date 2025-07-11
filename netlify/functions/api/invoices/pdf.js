const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');

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

// Generate PDF for an invoice
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Verify token
    const user = verifyToken(event.headers.authorization);
    
    // Get invoice ID from query parameters
    const queryParams = new URLSearchParams(event.queryStringParameters || {});
    const invoiceId = queryParams.get('id');
    
    if (!invoiceId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invoice ID is required' })
      };
    }
    
    // Connect to database
    const client = await pool.connect();
    
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
      
      // Fetch company details from settings
      const settingsResult = await client.query(`
        SELECT key, value FROM settings
        WHERE category = 'invoice' AND key IN (
          'company_name',
          'company_gstin',
          'company_address',
          'company_email',
          'company_phone',
          'bank_name',
          'bank_account_number',
          'bank_ifsc'
        )
      `);
      
      // Convert settings to a single object
      const settings = settingsResult.rows.reduce((obj, row) => {
        obj[row.key] = row.value;
        return obj;
      }, {});
      
      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });
      
      // Company details
      const companyDetails = {
        name: settings.company_name || 'Nikagenyx',
        gstin: settings.company_gstin || '29AADCB2230M1ZT',
        address: settings.company_address || '123 Main Street, Bangalore, Karnataka 560001',
        email: settings.company_email || 'accounts@nikagenyx.com',
        phone: settings.company_phone || '+91 98765 43210',
        bankName: settings.bank_name || 'HDFC Bank',
        bankAccount: settings.bank_account_number || '12345678901',
        bankIfsc: settings.bank_ifsc || 'HDFC0001234'
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
      doc.fontSize(10).font('Helvetica').text(`Account Name: ${companyDetails.name}`, 300, y + 20);
      doc.fontSize(10).font('Helvetica').text(`Account #: ${companyDetails.bankAccount}`, 300, y + 40);
      doc.fontSize(10).font('Helvetica').text(`IFSC: ${companyDetails.bankIfsc}`, 300, y + 60);
      doc.fontSize(10).font('Helvetica').text(`Bank: ${companyDetails.bankName}`, 300, y + 80);
      
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
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to generate PDF' })
    };
  }
};
