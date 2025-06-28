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
    const { emp_id, role } = JSON.parse(event.body);
    if (!emp_id || !role) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "emp_id and role are required." })
      };
    }

    await pool.query(`UPDATE employees SET role = $1 WHERE emp_id = $2`, [role, emp_id]);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Role updated successfully." })
    };
  } catch (err) {
    console.error("❌ Role Update Error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: err.message })
    };
  }
};
