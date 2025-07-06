const { Pool } = require("pg");
const nodemailer = require("nodemailer");
const twilio = require("twilio");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method Not Allowed" };

  const { empId } = JSON.parse(event.body || "{}");
  if (!empId) return { statusCode: 400, body: "Missing empId" };

  const db = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const { rows } = await db.query(
      "SELECT name FROM employees WHERE emp_id = $1",
      [empId]
    );

    if (!rows.length) {
      return { statusCode: 404, body: "Employee not found" };
    }

    const name = rows[0].name;

    // ✅ Flag employee for PIN reset
    await db.query(
      "UPDATE employees SET reset_pin_ready = true WHERE emp_id = $1",
      [empId]
    );

    // ✅ Email notification
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.ADMIN_EMAIL_USER,
        pass: process.env.ADMIN_EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: '"Nikagenyx System" <no-reply@nikagenyx.com>',
      to: "n.dcosta@nikagenyx.com",
      subject: "PIN Reset Request",
      text: `Employee ${name} (ID: ${empId}) has requested a PIN reset.`,
    });

    // ✅ WhatsApp via Twilio
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
    await client.messages.create({
      from: "whatsapp:+14155238886",
      to: "whatsapp:+919284917644",
      body: `Employee ${name} (ID: ${empId}) has requested a PIN reset.`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Reset request sent. Await admin approval.",
      }),
    };
  } catch (err) {
    console.error("Forgot PIN error:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  } finally {
    await db.end();
  }
};
