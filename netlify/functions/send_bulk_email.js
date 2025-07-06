const nodemailer = require("nodemailer");
const multiparty = require("multiparty");
const fs = require("fs");
const path = require("path");
const { query } = require("../../db"); // Adjust path if needed

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const form = new multiparty.Form();

  return new Promise((resolve, reject) => {
    form.parse(event, async (err, fields, files) => {
      if (err) {
        console.error("Form parsing error:", err);
        return resolve({
          statusCode: 400,
          body: JSON.stringify({ message: "Form parsing failed" }),
        });
      }

      try {
        const from = fields.from?.[0];
        const subject = fields.subject?.[0];
        const bodyText = fields.body?.[0];
        const recipientIds = JSON.parse(fields.recipients?.[0] || "[]");

        if (!from || !subject || !bodyText || recipientIds.length === 0) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields" }),
          });
        }

        // Fetch recipient emails from DB using emp_ids
        const placeholders = recipientIds.map((_, i) => `$${i + 1}`).join(",");
        const result = await query(
          `SELECT emp_id, name, email FROM employees WHERE emp_id IN (${placeholders})`,
          recipientIds
        );

        const recipients = result.rows.filter(r => r.email);

        // Read embedded HEADER and FOOTER images as base64 (public/assets)
        const headerPath = path.resolve(__dirname, "../../public/assets/HEADER.png");
        const footerPath = path.resolve(__dirname, "../../public/assets/FOOTER.png");

        const headerImg = fs.existsSync(headerPath) ? fs.readFileSync(headerPath).toString("base64") : null;
        const footerImg = fs.existsSync(footerPath) ? fs.readFileSync(footerPath).toString("base64") : null;

        // Set up mail transporter (example using Gmail)
        const transporter = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
          },
        });

        // Handle attachment if present
        let attachment = null;
        if (files.attachment?.length > 0) {
          const file = files.attachment[0];
          attachment = {
            filename: file.originalFilename,
            path: file.path,
          };
        }

        // Send emails one-by-one with merge logic
        for (const emp of recipients) {
          const htmlContent = `
            <div style="font-family: Arial, sans-serif; font-size: 14px;">
              ${headerImg ? `<img src="cid:header" style="width:100%; max-width:600px;" />` : ""}
              <p>Dear ${emp.name || "Team Member"},</p>
              <p>${bodyText.replace(/\n/g, "<br>")}</p>
              <br>
              ${footerImg ? `<img src="cid:footer" style="width:100%; max-width:600px;" />` : ""}
            </div>
          `;

          const mailOptions = {
            from,
            to: emp.email,
            subject,
            html: htmlContent,
            attachments: [
              ...(attachment ? [attachment] : []),
              ...(headerImg ? [{ filename: "header.png", content: Buffer.from(headerImg, "base64"), cid: "header" }] : []),
              ...(footerImg ? [{ filename: "footer.png", content: Buffer.from(footerImg, "base64"), cid: "footer" }] : []),
            ],
          };

          await transporter.sendMail(mailOptions);
        }

        return resolve({
          statusCode: 200,
          body: JSON.stringify({ message: "Emails sent successfully." }),
        });

      } catch (error) {
        console.error("Email sending error:", error);
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        });
      }
    });
  });
};
