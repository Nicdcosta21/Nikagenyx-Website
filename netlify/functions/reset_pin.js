// netlify/functions/reset_pin.js
const { Pool } = require('pg');

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
        body: JSON.stringify({ message: "Employee ID is required" })
      };
    }

    // Update the employee's PIN to '0000'
    await pool.query("UPDATE employees SET pin = '0000' WHERE emp_id = $1", [emp_id]);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `PIN reset to default for ${emp_id}` })
    };

  } catch (error) {
    console.error("❌ Reset PIN Error:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: error.message })
    };
  }
};
