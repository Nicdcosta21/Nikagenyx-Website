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
        body: JSON.stringify({ message: "Employee ID is required." })
      };
    }

    const result = await pool.query(`DELETE FROM employees WHERE emp_id = $1`, [emp_id]);

    if (result.rowCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Employee not found or already deleted." })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Employee deleted successfully" })
    };
  } catch (err) {
    console.error("❌ Delete Error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: err.message })
    };
  }
};
