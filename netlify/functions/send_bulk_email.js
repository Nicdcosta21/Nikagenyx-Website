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

// Helper: Get full employee data for mail merge
async function getEmployeeEmails(empIds) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT emp_id, name, email, phone, dob, department, role, base_salary
      FROM employees
      WHERE emp_id = ANY($1)
    `;
    const { rows } = await client.query(query, [empIds]);
    return rows;
  } finally {
    client.release();
  }
}

// Public URLs for header and footer images
const header_url = "https://raw.githubusercontent.com/Nicdcosta21/Nikagenyx-Website/main/assets/HEADER.png";
const footer_url = "https://raw.githubusercontent.com/Nicdcosta21/Nikagenyx-Website/main/assets/FOOTER.png";

// Helper to normalize line endings and convert to HTML linebreaks
function normalizeForHtml(str) {
  return (str || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n/g, "<br/>");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
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
        return resolve({
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Form parse error" }),
        });
      }

      try {
        const from = "n.dcosta@nikagenyx.com";
        const fromName = "Nik D'Costa";
        const smtpPass = fields.smtp_password?.[0];
        const subject = fields.subject?.[0];
        const body = fields.body?.[0];
        const empIds = JSON.parse(fields.recipients?.[0] || "[]");
        const attachments = files.attachment || [];

        if (!smtpPass || !subject || !body || !Array.isArray(empIds) || empIds.length === 0) {
          return resolve({
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
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
        let sentCount = 0;

        for (const emp of recipients) {
          if (!emp.email) {
            failed.push(emp.emp_id);
            continue;
          }

          // Format DOB if present
          let formattedDob = "-";
          if (emp.dob) {
            try {
              formattedDob = new Date(emp.dob).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });
            } catch {
              formattedDob = emp.dob;
            }
          }

          const mailOptions = {
            from: `"${fromName}" <${from}>`,
            to: emp.email,
            subject,
            html: `
              <div style="background-color:#f5f5f5; padding: 40px 0; font-family: Arial, sans-serif;">
                <div style="max-width:600px; margin:auto; background:white; border-radius:8px; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
                  <div style="text-align:center; background-color:#0f0e2c;">
                    <img src="${header_url}" alt="Header" style="max-width:100%; height:auto;" />
                  </div>
                  <div style="padding: 30px 40px; font-family: Arial, sans-serif;">
                    <p style="font-size: 18px;">Dear ${emp.name || "-"},</p>
                    
                    <br/>
                    <div style="font-size: 16px; line-height: 1.6;">
                      ${normalizeForHtml(body)}
                    </div>
                    <br/>
                    <p style="margin-top: 30px; font-size: 16px;">
                      Best regards,<br/>
                      <strong>${fromName}</strong><br/>
                      Managing Director<br/>
                      Nikagenyx Vision Tech Private Limited<br/>
                      <a href="mailto:n.dcosta@nikagenyx.com">n.dcosta@nikagenyx.com</a><br/>
                      +91 86004 50072<br/>
                      Pune, Maharashtra, India
                    </p>
                  </div>
                  <div style="text-align:center; background-color:#0f0e2c;">
                    <img src="${footer_url}" alt="Footer" style="max-width:100%; height:auto;" />
                    <div style="color:#ccc; font-size:12px; margin-top:8px;">
                      © 2025 Nikagenyx Vision Tech Private Limited. All rights reserved.
                    </div>
                  </div>
                </div>
              </div>
            `,
            attachments: (attachments || []).map(file => ({
              filename: file.originalFilename,
              content: fs.createReadStream(file.path),
            })),
          };

          try {
            await transporter.sendMail(mailOptions);
            sentCount++;
          } catch (mailErr) {
            console.error(`❌ Failed for ${emp.emp_id} (${emp.email}):`, mailErr);
            failed.push(emp.emp_id);
          }
        }

        return resolve({
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `✅ Emails sent: ${sentCount}, Failed: ${failed.length}`,
            failed,
          }),
        });
      } catch (err) {
        console.error("❌ Internal Error:", err);
        return resolve({
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Internal server error" }),
        });
      }
    });
  });
};
