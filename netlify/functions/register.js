// netlify/functions/register.js
const { Pool } = require('pg');

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
    const { firstName, lastName, phone, dob, pin, photo } = data;

    if (!firstName || !lastName || !phone || !dob || !pin || !photo) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "All fields are required." })
      };
    }

    const emp_id = `NGX${Date.now().toString().slice(-6)}`;
    const fullName = `${firstName} ${lastName}`;

    await pool.query(
      `INSERT INTO employees (emp_id, name, pin, role, department, phone, dob, photo_base64)
       VALUES ($1, $2, $3, 'employee', NULL, $4, $5, $6)`,
      [emp_id, fullName, pin, phone, dob, photo]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Employee registered successfully", emp_id })
    };
  } catch (err) {
    console.error("❌ Register Error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: err.message })
    };
  }
};
