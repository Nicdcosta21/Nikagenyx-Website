const { Pool } = require('pg');
const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// AWS S3 configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Load email template
const loadEmailTemplate = async () => {
  const templatePath = path.join(__dirname, '../../../src/templates/report-email.html');
  const templateContent = await fs.readFile(templatePath, 'utf8');
  return handlebars.compile(templateContent);
};

exports.handler = async (event, context) => {
  const client = await pool.connect();
  
  try {
    // Get all scheduled reports that need to be processed
    const scheduledReports = await client.query(`
      SELECT 
        sr.*,
        cr.title as report_title,
        cr.config as report_config
      FROM scheduled_reports sr
      JOIN custom_reports cr ON sr.report_id = cr.id
      WHERE sr.active = true
        AND sr.next_run_at <= NOW()
      ORDER BY sr.next_run_at ASC
    `);

    for (const report of scheduledReports.rows) {
      try {
        // Generate the report
        const reportContent = await generateReport(report);
        
        // Upload to S3
        const fileName = `reports/${report.id}/${Date.now()}.${report.format}`;
        await s3.upload({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: fileName,
          Body: reportContent,
          ContentType: getContentType(report.format)
        }).promise();
        
        // Get signed URL for the report
        const signedUrl = await s3.getSignedUrlPromise('getObject', {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: fileName,
          Expires: 604800 // URL expires in 7 days
        });
        
        // Send email to recipients
        const template = await loadEmailTemplate();
        const emailHtml = template({
          logoUrl: process.env.COMPANY_LOGO_URL,
          reportName: report.report_name,
          periodLabel: getPeriodLabel(report.schedule),
          emailBody: report.email_body,
          reportType: report.report_type,
          format: report.format.toUpperCase(),
          generatedDate: new Date().toLocaleString(),
          viewReportUrl: signedUrl,
          settingsUrl: `${process.env.APP_URL}/accounts/reports/scheduled`
        });

        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: report.recipients,
          subject: report.email_subject,
          html: emailHtml,
          attachments: [{
            filename: `${report.report_name}.${report.format}`,
            content: reportContent
          }]
        });
        
        // Update last run time and next run time
        await client.query(`
          UPDATE scheduled_reports
          SET 
            last_run_at = NOW(),
            next_run_at = $1,
            updated_at = NOW()
          WHERE id = $2
        `, [
          calculateNextRunDate(report.schedule),
          report.id
        ]);
        
        // Log successful execution
        await client.query(`
          INSERT INTO report_runs (
            report_id,
            report_type,
            format,
            status,
            started_at,
            completed_at,
            created_by
          )
          VALUES ($1, $2, $3, 'completed',
