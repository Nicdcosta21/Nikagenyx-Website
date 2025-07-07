const multiparty = require("multiparty");
const nodemailer = require("nodemailer");
const { Pool } = require("pg");
const fs = require("fs");

// Setup PostgreSQL
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Helper: Get employee emails
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

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  return new Promise((resolve) => {
    const form = new multiparty.Form();

    // 👇 Correct: parse `event.body` as a buffer
    const buffer = Buffer.from(event.body, "base64");
    const fakeReq = require("stream").Readable.from(buffer);
    const fakeRes = {};

    form.parse(fakeReq, async (err, fields, files) => {
      if (err) {
        console.error("❌ Form parsing error:", err);
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ message: "Form parse error" }),
        });
      }

      try {
        const from = fields.from?.[0];
        const smtpPass = fields.smtp_password?.[0];
        const subject = fields.subject?.[0];
        const body = fields.body?.[0];
        const empIds = JSON.parse(fields.recipients?.[0] || "[]");
        const attachments = files.attachment || [];

        if (!from || !smtpPass || !subject || !body || empIds.length === 0) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields" }),
          });
        }

        // Setup dynamic transporter
        const transporter = nodemailer.createTransport({
          host: "smtpout.secureserver.net",
          port: 465,
          secure: true,
          auth: {
            user: from,
            pass: smtpPass,
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
            attachments: attachments.map(file => ({
              filename: file.originalFilename,
              content: fs.createReadStream(file.path),
            })),
          };

          try {
            await transporter.sendMail(mailOptions);
          } catch (mailErr) {
            console.error(`❌ Failed for ${emp.emp_id}:`, mailErr);
            failed.push(emp.emp_id);
          }
        }

        return resolve({
          statusCode: 200,
          body: JSON.stringify({
            message: `✅ Emails sent: ${recipients.length - failed.length}, Failed: ${failed.length}`,
            failed,
          }),
        });

      } catch (err) {
        console.error("❌ Internal Error:", err);
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ message: "Internal server error" }),
        });
      }
    });
  });
};
