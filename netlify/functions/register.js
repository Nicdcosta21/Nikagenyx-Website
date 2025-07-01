const { Pool } = require('pg');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
  console.log("🔁 Register function triggered");

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" })
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { firstName, lastName, phone, dob, pin, photo, department } = data;

    if (!firstName || !lastName || !phone || !dob || !pin || !photo || !department) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "All fields are required." })
      };
    }

    const fullName = `${firstName} ${lastName}`;

    // 🔍 Check if user already exists by phone or (name + dob)
    const duplicateCheck = await pool.query(
      `SELECT * FROM employees WHERE phone = $1 OR (name = $2 AND dob = $3)`,
      [phone, fullName, dob]
    );

    if (duplicateCheck.rows.length > 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: "Employee already exists." })
      };
    }

    // Generate unique employee ID
    const emp_id = `NGX${Date.now().toString().slice(-6)}`;

    // 🔐 Generate MFA secret
    const secret = speakeasy.generateSecret({
      name: `Nikagenyx (${fullName})`,
    });

    // 📸 Generate QR code for authenticator app
    const qr_code_url = await QRCode.toDataURL(secret.otpauth_url);

    // 💾 Insert new employee into database
    await pool.query(
      `INSERT INTO employees (emp_id, name, pin, role, department, phone, dob, photo_base64, mfa_secret)
       VALUES ($1, $2, $3, 'employee', $4, $5, $6, $7, $8)`,
      [emp_id, fullName, pin, department, phone, dob, photo, secret.base32]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Employee registered successfully",
        emp_id,
        qr_code_url,
        mfa_secret: secret.base32
      })
    };

  } catch (err) {
    console.error("❌ Register Error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: err.message })
    };
  }
};
