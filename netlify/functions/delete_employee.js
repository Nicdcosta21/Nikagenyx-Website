// netlify/functions/delete_employee.js
const { Pool } = require('pg');

const verify = require('./verifySession');
try { verify(event); } catch { return { statusCode: 401 }; }

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ message: "Method Not Allowed" }) };
  }

  try {
    const { emp_id } = JSON.parse(event.body);
    if (!emp_id) {
      return { statusCode: 400, body: JSON.stringify({ message: "Employee ID is required" }) };
    }

    await pool.query(`DELETE FROM employees WHERE emp_id = $1`, [emp_id]);
    return { statusCode: 200, body: JSON.stringify({ message: `Employee ${emp_id} deleted.` }) };
  } catch (err) {
    console.error("❌ Delete error:", err.message);
    return { statusCode: 500, body: JSON.stringify({ message: "Server error", error: err.message }) };
  }
};
