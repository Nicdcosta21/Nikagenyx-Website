const { Pool } = require("pg");
const speakeasy = require("speakeasy");

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
    } = JSON.parse(event.body);

    const fullName = `${firstName} ${lastName}`;

    // ✅ Only verify MFA
    const verified = speakeasy.totp.verify({
      secret: mfa_secret,
      encoding: "base32",
      token: mfa_code
    });

    if (!verified) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Invalid MFA code" })
      };
    }

    // ✅ Now insert to DB
    await pool.query(
      `INSERT INTO employees (emp_id, name, pin, role, department, phone, dob, photo_base64, mfa_secret)
       VALUES ($1, $2, $3, 'employee', $4, $5, $6, $7, $8)`,
      [emp_id, fullName, pin, department, phone, dob, photo, mfa_secret]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Employee registered successfully" })
    };

  } catch (err) {
    console.error("❌ Finalize Registration Error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: err.message })
    };
  }
};
