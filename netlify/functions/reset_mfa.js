const { Pool } = require('pg');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');


const verify = require('./verifySession');
try { verify(event); } catch { return { statusCode: 401 }; }

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" })
    };
  }

  try {
    const { emp_id } = JSON.parse(event.body);
    if (!emp_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Employee ID is required." })
      };
    }

    // Fetch employee name
    const result = await pool.query('SELECT name FROM employees WHERE emp_id = $1', [emp_id]);
    if (result.rowCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Employee not found." })
      };
    }

    const fullName = result.rows[0].name;

    // Generate new MFA secret
    const secret = speakeasy.generateSecret({
      name: `Nikagenyx (${fullName})`,
    });

    const otpAuthUrl = secret.otpauth_url;
    const qr_code_url = await QRCode.toDataURL(otpAuthUrl);

    // Update secret in DB
    await pool.query(
      `UPDATE employees SET mfa_secret = $1 WHERE emp_id = $2`,
      [secret.base32, emp_id]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "MFA secret reset successfully",
        mfa_secret: secret.base32,
        qr_code_url
      })
    };

  } catch (err) {
    console.error("❌ Reset MFA Error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: err.message })
    };
  }
};
