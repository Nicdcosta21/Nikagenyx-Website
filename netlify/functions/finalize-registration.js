// netlify/functions/finalize-registration.js
const { Pool } = require("pg");
const speakeasy = require("speakeasy");

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body);
    const {
      emp_id,
      firstName,
      lastName,
      phone,
      dob,
      pin,
      photo,
      department,
      mfa_secret,
      mfa_code
    } = data;

    if (!emp_id || !firstName || !lastName || !phone || !dob || !pin || !photo || !department || !mfa_secret || !mfa_code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "All fields required." })
      };
    }

    const fullName = `${firstName} ${lastName}`;

    // Check duplicate
    const exists = await pool.query(
      `SELECT * FROM employees WHERE phone = $1 OR (name = $2 AND dob = $3)`,
      [phone, fullName, dob]
    );
    if (exists.rows.length > 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: "Employee already exists." })
      };
    }

    // Verify MFA code
    const verified = speakeasy.totp.verify({
      secret: mfa_secret,
      encoding: "base32",
      token: mfa_code
    });

    if (!verified) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Invalid MFA code." })
      };
    }

    // Insert to DB
    await pool.query(
      `INSERT INTO employees (emp_id, name, pin, role, department, phone, dob, photo_base64, mfa_secret)
       VALUES ($1, $2, $3, 'employee', $4, $5, $6, $7, $8)`,
      [emp_id, fullName, pin, department, phone, dob, photo, mfa_secret]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Registration completed successfully." })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: err.message })
    };
  }
};
