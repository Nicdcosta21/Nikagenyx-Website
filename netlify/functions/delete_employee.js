const { Pool } = require("pg");
const jwt = require("jsonwebtoken");

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
    const { emp_id, admin_id, mfa_token } = JSON.parse(event.body);
    if (!emp_id || !admin_id || !mfa_token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing parameters" }),
      };
    }

    const mfaRes = await fetch(`${process.env.URL}/.netlify/functions/verify_mfa_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin_id, token: mfa_token }),
    });
    const mfaResult = await mfaRes.json();

    if (!mfaResult.valid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Invalid MFA token" }),
      };
    }

    await pool.query("DELETE FROM employees WHERE emp_id = $1", [emp_id]);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Employee deleted successfully" }),
    };
  } catch (err) {
    console.error("Delete Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};