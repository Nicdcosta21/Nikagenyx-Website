const { Pool } = require("pg");
const speakeasy = require("speakeasy");

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  try {
    const { emp_id } = JSON.parse(event.body);
    if (!emp_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing emp_id" }),
      };
    }

    const { rows } = await pool.query(
      "SELECT failed_mfa_attempts FROM employees WHERE emp_id = $1",
      [emp_id]
    );

    if (!rows.length || rows[0].failed_mfa_attempts < 3) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "MFA reset not allowed. Less than 3 failed attempts." }),
      };
    }

    const secret = speakeasy.generateSecret({ length: 20 });
    const qr_code_url = `otpauth://totp/Nikagenyx:${emp_id}?secret=${secret.base32}&issuer=Nikagenyx`;

    await pool.query(
      "UPDATE employees SET mfa_secret = $1, failed_mfa_attempts = 0 WHERE emp_id = $2",
      [secret.base32, emp_id]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "MFA reset. Please reconfigure MFA.",
        secret_key: secret.base32,
        qr_code_url
      }),
    };
  } catch (err) {
    console.error("Reset MFA Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};