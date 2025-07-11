const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const Excel = require('exceljs');
const { createObjectCsvStringifier } = require('csv-writer');
const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize Google Cloud Storage
const storage = new Storage({
  keyFilename: path.join(__dirname, '../../../config/gcs-key.json')
});
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

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

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// Helper function to generate PDF report
const generatePdf = async (reportData, reportType) => {
  const doc = new PDFDocument();
  const chunks = [];
  
  doc.on('data', chunk => chunks.push(chunk));
  
  // Add report header
  doc.fontSize(20).text(reportData.title, { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(reportData.subtitle, { align: 'center' });
  doc.moveDown();
  
  // Add report content based on type
  switch (reportType) {
    case 'balance-sheet':
      // Add assets section
      doc.fontSize(14).text('Assets', { underline: true });
      doc.moveDown();
      reportData.assets.forEach(asset => {
        doc.fontSize(10).text(`${asset.name}: ${formatCurrency(asset.balance)}`, { indent: 20 });
      });
      doc.moveDown();
      doc.fontSize(12).text(`Total Assets: ${formatCurrency(reportData.totalAssets)}`);
      doc.moveDown();
      
      // Add liabilities section
      doc.fontSize(14).text('Liabilities', { underline: true });
      doc.moveDown();
      reportData.liabilities.forEach(liability => {
        doc.fontSize(10).text(`${liability.name}: ${formatCurrency(liability.balance)}`, { indent: 20 });
      });
      doc.moveDown();
      doc.fontSize(12).text(`Total Liabilities: ${formatCurrency(reportData.totalLiabilities)}`);
      doc.moveDown();
      
      // Add equity section
      doc.fontSize(14).text('Equity', { underline: true });
      doc.moveDown();
      reportData.equity.forEach(equity => {
        doc.fontSize(10).text(`${equity.name}: ${formatCurrency(equity.balance)}`, { indent: 20 });
      });
      doc.moveDown();
      doc.fontSize(12).text(`Total Equity: ${formatCurrency(reportData.totalEquity)}`);
      break;
      
    case 'profit-loss':
      // Add income section
      doc.fontSize(14).text('Income', { underline: true });
      doc.moveDown();
      reportData.income.forEach(income => {
        doc.fontSize(10).text(`${income.name}: ${formatCurrency(income.amount)}`, { indent: 20 });
      });
      doc.moveDown();
      doc.fontSize(12).text(`Total Income: ${formatCurrency(reportData.totalIncome)}`);
      doc.moveDown();
      
      // Add expenses section
      doc.fontSize(14).text('Expenses', { underline: true });
      doc.moveDown();
      reportData.expenses.forEach(expense => {
        doc.fontSize(10).text(`${expense.name}: ${formatCurrency(expense.amount)}`, { indent: 20 });
      });
      doc.moveDown();
      doc.fontSize(12).text(`Total Expenses: ${formatCurrency(reportData.totalExpenses)}`);
      doc.moveDown();
      
      // Add net income
      doc.fontSize(14).text(`Net Income: ${formatCurrency(reportData.netIncome)}`, { underline: true });
      break;
      
    case 'cash-flow':
      // Add operating activities
      doc.fontSize(14).text('Operating Activities', { underline: true });
      doc.moveDown();
      reportData.operatingActivities.forEach(activity => {
        doc.fontSize(10).text(`${activity.description}: ${formatCurrency(activity.amount)}`, { indent: 20 });
      });
      doc.moveDown();
      doc.fontSize(12).text(`Net Cash from Operations: ${formatCurrency(reportData.netOperatingCash)}`);
      doc.moveDown();
      
      // Add investing activities
      doc.fontSize(14).text('Investing Activities', { underline: true });
      doc.moveDown();
      reportData.investingActivities.forEach(activity => {
        doc.fontSize(10).text(`${activity.description}: ${formatCurrency(activity.amount)}`, { indent: 20 });
      });
      doc.moveDown();
      doc.fontSize(12).text(`Net Cash from Investing: ${formatCurrency(reportData.netInvestingCash)}`);
      doc.moveDown();
      
      // Add financing activities
      doc.fontSize(14).text('Financing Activities', { underline: true });
      doc.moveDown();
      reportData.financingActivities.forEach(activity => {
        doc.fontSize(10).text(`${activity.description}: ${formatCurrency(activity.amount)}`, { indent: 20 });
      });
      doc.moveDown();
      doc.fontSize(12).text(`Net Cash from Financing: ${formatCurrency(reportData.netFinancingCash)}`);
      doc.moveDown();
      
      // Add net change in cash
      doc.fontSize(14).text(`Net Change in Cash: ${formatCurrency(reportData.netCashChange)}`, { underline: true });
      break;
      
    case 'custom':
      // Add custom report content
      reportData.rows.forEach(row => {
        const rowText = Object.values(row).join(' | ');
        doc.fontSize(10).text(rowText);
      });
      
      // Add totals if available
      if (reportData.totals) {
        doc.moveDown();
        doc.fontSize(12).text('Totals:', { underline: true });
        Object.entries(reportData.totals).forEach(([key, value]) => {
          doc.fontSize(10).text(`${key}: ${formatCurrency(value)}`);
        });
      }
      break;
  }
  
  // Finalize PDF
  doc.end();
  
  return Buffer.concat(chunks);
};

// Helper function to generate Excel report
const generateExcel = async (reportData, reportType) => {
  const workbook = new Excel.Workbook();
  const worksheet = workbook.addWorksheet(reportType);
  
  // Add report header
  worksheet.mergeCells('A1:E1');
  worksheet.getCell('A1').value = reportData.title;
  worksheet.getCell('A1').alignment = { horizontal: 'center' };
  worksheet.getCell('A1').font = { size: 14, bold: true };
  
  worksheet.mergeCells('A2:E2');
  worksheet.getCell('A2').value = reportData.subtitle;
  worksheet.getCell('A2').alignment = { horizontal: 'center' };
  
  // Add report content based on type
  let currentRow = 4;
  
  switch (reportType) {
    case 'balance-sheet':
      // Add assets section
      worksheet.getCell(`A${currentRow}`).value = 'Assets';
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      currentRow++;
      
      reportData.assets.forEach(asset => {
        worksheet.getCell(`B${currentRow}`).value = asset.name;
        worksheet.getCell(`C${currentRow}`).value = asset.balance;
        worksheet.getCell(`C${currentRow}`).numFmt = '#,##0.00';
        currentRow++;
      });
      
      worksheet.getCell(`B${currentRow}`).value = 'Total Assets';
      worksheet.getCell(`C${currentRow}`).value = reportData.totalAssets;
      worksheet.getCell(`C${currentRow}`).numFmt = '#,##0.00';
      worksheet.getCell(`B${currentRow}`).font = { bold: true };
      currentRow += 2;
      
      // Add liabilities section
      worksheet.getCell(`A${currentRow}`).value = 'Liabilities';
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      currentRow++;
      
      reportData.liabilities.forEach(liability => {
        worksheet.getCell(`B${currentRow}`).value = liability.name;
        worksheet.getCell(`C${currentRow}`).value = liability.balance;
        worksheet.getCell(`C${currentRow}`).numFmt = '#,##0.00';
        currentRow++;
      });
      
      worksheet.getCell(`B${currentRow}`).value = 'Total Liabilities';
      worksheet.getCell(`C${currentRow}`).value = reportData.totalLiabilities;
      worksheet.getCell(`C${currentRow}`).numFmt = '#,##0.00';
      worksheet.getCell(`B${currentRow}`).font = { bold: true };
      currentRow += 2;
      
      // Add equity section
      worksheet.getCell(`A${currentRow}`).value = 'Equity';
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      currentRow++;
      
      reportData.equity.forEach(equity => {
        worksheet.getCell(`B${currentRow}`).value = equity.name;
        worksheet.getCell(`C${currentRow}`).value = equity.balance;
        worksheet.getCell(`C${currentRow}`).numFmt = '#,##0.00';
        currentRow++;
      });
      
      worksheet.getCell(`B${currentRow}`).value = 'Total Equity';
      worksheet.getCell(`C${currentRow}`).value = reportData.totalEquity;
      worksheet.getCell(`C${currentRow}`).numFmt = '#,##0.00';
      worksheet.getCell(`B${currentRow}`).font = { bold: true };
      break;
      
    // Add similar cases for profit-loss and cash-flow
    // The structure will be similar but with different sections and calculations
  }
  
  // Generate buffer
  return await workbook.xlsx.writeBuffer();
};

// Helper function to generate CSV report
const generateCsv = async (reportData, reportType) => {
  let headers = [];
  let records = [];
  
  switch (reportType) {
    case 'balance-sheet':
      headers = [
        { id: 'category', title: 'Category' },
        { id: 'name', title: 'Account' },
        { id: 'balance', title: 'Balance' }
      ];
      
      // Add assets
      records = records.concat(
        reportData.assets.map(asset => ({
          category: 'Assets',
          name: asset.name,
          balance: asset.balance
        }))
      );
      
      // Add total assets
      records.push({
        category: 'Assets',
        name: 'Total Assets',
        balance: reportData.totalAssets
      });
      
      // Add liabilities
      records = records.concat(
        reportData.liabilities.map(liability => ({
          category: 'Liabilities',
          name: liability.name,
          balance: liability.balance
        }))
      );
      
      // Add total liabilities
      records.push({
        category: 'Liabilities',
        name: 'Total Liabilities',
        balance: reportData.totalLiabilities
      });
      
      // Add equity
      records = records.concat(
        reportData.equity.map(equity => ({
          category: 'Equity',
          name: equity.name,
          balance: equity.balance
        }))
      );
      
      // Add total equity
      records.push({
        category: 'Equity',
        name: 'Total Equity',
        balance: reportData.totalEquity
      });
      break;
      
    // Add similar cases for profit-loss and cash-flow
    // The structure will be similar but with different headers and records
  }
  
  const csvStringifier = createObjectCsvStringifier({ header: headers });
  return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS requests (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Verify token
    const user = verifyToken(event.headers.authorization);
    
    // Get parameters
    const params = new URLSearchParams(event.queryStringParameters || {});
    const reportType = event.path.split('/').pop();
    const format = params.get('format') || 'pdf';
    
    // Connect to database
    const client = await pool.connect();
    
    try {
      // Get report data based on type and parameters
      let reportData;
      switch (reportType) {
        case 'balance-sheet':
          // Get balance sheet data
          break;
          
        case 'profit-loss':
          // Get profit & loss data
          break;
          
        case 'cash-flow':
          // Get cash flow data
          break;
          
        case 'custom':
          // Get custom report data
          break;
          
        default:
          throw new Error('Invalid report type');
      }
      
      // Generate report in requested format
      let fileContent;
      let contentType;
      let fileExtension;
      
      switch (format) {
        case 'pdf':
          fileContent = await generatePdf(reportData, reportType);
          contentType = 'application/pdf';
          fileExtension = 'pdf';
          break;
          
        case 'excel':
          fileContent = await generateExcel(reportData, reportType);
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          fileExtension = 'xlsx';
          break;
          
        case 'csv':
          fileContent = await generateCsv(reportData, reportType);
          contentType = 'text/csv';
          fileExtension = 'csv';
          break;
          
        default:
          throw new Error('Invalid format');
      }
      
      // Upload file to Google Cloud Storage
      const fileName = `reports/${user.sub}/${reportType}-${Date.now()}.${fileExtension}`;
      const file = bucket.file(fileName);
      
      await file.save(fileContent, {
        contentType,
        metadata: {
          contentDisposition: `attachment; filename="${reportType}.${fileExtension}"`
        }
      });
      
      // Get signed URL for download
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000 // URL expires in 15 minutes
      });
      
      // Save export record
      await client.query(`
        INSERT INTO report_exports (
          report_id,
          report_type,
          format,
          file_path,
          file_size,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        reportData.id,
        reportType,
        format,
        fileName,
        fileContent.length,
        user.sub
      ]);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ url })
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
