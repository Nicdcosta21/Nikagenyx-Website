const { Pool } = require('pg');


const verify = require('./verifySession');
try { verify(event); } catch { return { statusCode: 401 }; }

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async () => {
  try {
    const result = await pool.query(`
      SELECT emp_id, name, phone, dob, role, department, pin, photo_base64
      FROM employees
      ORDER BY emp_id ASC
    `);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Employee data retrieved successfully",
        employees: result.rows
      })
    };

  } catch (err) {
    console.error("❌ DB Fetch Error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Database error", error: err.message })
    };
  }
};
