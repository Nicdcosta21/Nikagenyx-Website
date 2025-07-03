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
    const { emp_id, name, phone, dob, role, department, base_salary, admin_id, mfa_token } = JSON.parse(event.body);

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

    await pool.query(
      "UPDATE employees SET name=$1, phone=$2, dob=$3, role=$4, department=$5, base_salary=$6 WHERE emp_id=$7",
      [name, phone, dob, role, department, base_salary, emp_id]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Employee profile updated." }),
    };
  } catch (err) {
    console.error("Update Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};