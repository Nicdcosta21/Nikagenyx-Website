const multiparty = require("multiparty");
const nodemailer = require("nodemailer");
const { Pool } = require("pg");
const fs = require("fs");

// --- Setup DB ---
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// --- Helper to fetch employee emails ---
async function getEmployeeEmails(empIds) {
  const client = await pool.connect();
  try {
    const query = `SELECT emp_id, name, email FROM employees WHERE emp_id = ANY($1)`;
    const { rows } = await client.query(query, [empIds]);
    return rows;
  } finally {
    client.release();
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  return new Promise((resolve) => {
    const form = new multiparty.Form();

    form.parse(event, async (err, fields, files) => {
      if (err) {
        console.error("❌ Form parsing error:", err);
        return resolve({ statusCode: 500, body: "Form parsing failed" });
      }

      try {
        const from = fields.from?.[0];
        const subject = fields.subject?.[0];
        const body = fields.body?.[0];
        const empIds = JSON.parse(fields.recipients?.[0] || "[]");
        const attachmentFiles = files.attachment || [];

        if (!from || !subject || !body || empIds.length === 0) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields" }),
          });
        }

        // --- Create transporter dynamically for the logged-in admin ---
        const transporter = nodemailer.createTransport({
          host: "smtpout.secureserver.net",
          port: 465,
          secure: true,
          auth: {
            user: from,
            pass: process.env.ADMIN_EMAIL_PASS,
          },
        });

        const recipients = await getEmployeeEmails(empIds);
        const failed = [];

        for (const emp of recipients) {
          if (!emp.email) {
            failed.push(emp.emp_id);
            continue;
          }

          const mailOptions = {
            from: `"Nikagenyx HR" <${from}>`,
            to: emp.email,
            subject,
            html: `
              <div style="font-family: Arial, sans-serif;">
                <img src="https://nikagenyx.netlify.app/assets/HEADER.png" style="width:100%;max-width:600px;" />
                <p>Dear ${emp.name},</p>
                <div style="margin: 10px 0;">${body.replace(/\n/g, "<br/>")}</div>
                <p>Best regards,<br/>Nikagenyx HR</p>
                <img src="https://nikagenyx.netlify.app/assets/FOOTER.png" style="width:100%;max-width:600px;" />
              </div>
            `,
          };

          if (attachmentFiles.length > 0) {
            mailOptions.attachments = attachmentFiles.map(file => ({
              filename: file.originalFilename,
              content: fs.createReadStream(file.path),
            }));
          }

          try {
            await transporter.sendMail(mailOptions);
          } catch (mailErr) {
            console.error(`❌ Email failed for ${emp.emp_id}:`, mailErr);
            failed.push(emp.emp_id);
          }
        }

        const successCount = recipients.length - failed.length;
        return resolve({
          statusCode: 200,
          body: JSON.stringify({
            message: `✅ Emails sent: ${successCount}, Failed: ${failed.length}`,
            failed,
          }),
        });
      } catch (error) {
        console.error("❌ Error in send_bulk_email:", error);
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ message: "Internal server error" }),
        });
      }
    });
  });
};
