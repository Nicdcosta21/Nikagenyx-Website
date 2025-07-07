const multiparty = require("multiparty");
const { Readable } = require("stream");
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

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  return new Promise((resolve) => {
    const form = new multiparty.Form();
    const buffer = Buffer.from(event.body, "base64");

    const fakeReq = new Readable({
      read() {
        this.push(buffer);
        this.push(null);
      },
    });

    fakeReq.headers = {
      "content-type": event.headers["content-type"] || event.headers["Content-Type"],
    };

    form.parse(fakeReq, async (err, fields, files) => {
      if (err) {
        console.error("❌ Form parse error:", err);
        return resolve({ statusCode: 500, body: JSON.stringify({ message: "Form parse error" }) });
      }

      try {
        const from = "n.dcosta@nikagenyx.com"; // ✅ Fixed authenticated sender
        const fromName = fields.from_name?.[0] || "Nikagenyx MD";
        const smtpPass = fields.smtp_password?.[0];
        const subject = fields.subject?.[0];
        const body = fields.body?.[0];
        const empIds = JSON.parse(fields.recipients?.[0] || "[]");
        const attachments = files.attachment || [];

        if (!smtpPass || !subject || !body || empIds.length === 0) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields" }),
          });
        }

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
  from: `"${fromName}" <${from}>`,
  to: emp.email,
  subject,
  html: `
    <div style="font-family: Arial, sans-serif;">
      <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAACAAAAAGfCAYAAADLDzJ1AAAAAXNSR0IArs4c6QAAIABJREFUeF7s3Q..." style="width:100%;max-width:600px;" />
      <p>Dear ${emp.name},</p>
      <div style="margin: 10px 0;">${body.replace(/\n/g, "<br/>")}</div>
      <p>Best regards,<br/>${fromName}</p>
      <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAACAAAAADACAYAAACQoIPjAAAAAXNSR0IArs4c6QAAIABJREFUeF7t3X..." style="width:100%;max-width:600px;" />
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
