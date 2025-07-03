const { Pool } = require("pg");

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
      "SELECT failed_pin_attempts FROM employees WHERE emp_id = $1",
      [emp_id]
    );

    if (!rows.length || rows[0].failed_pin_attempts < 3) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "PIN reset not allowed. Less than 3 failed attempts." }),
      };
    }

    await pool.query(
      "UPDATE employees SET failed_pin_attempts = 0 WHERE emp_id = $1",
      [emp_id]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "PIN reset by admin. Please refresh the page to continue." }),
    };
  } catch (err) {
    console.error("Reset PIN Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};