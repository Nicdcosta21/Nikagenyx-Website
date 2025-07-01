// File: netlify/functions/get_employees.js

const { Pool } = require('pg');
const verify = require('./verifySession'); // 🔐 Import session verifier

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" })
    };
  }

  try {
    // 🔐 Verify JWT and role
    const user = verify(event);

    if (!user || user.role !== 'admin') {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Forbidden: Admin access required" })
      };
    }

    const result = await pool.query(`
      SELECT emp_id, name, role, department, phone, dob, base_salary
      FROM employees
      ORDER BY name ASC
    `);

    return {
      statusCode: 200,
      body: JSON.stringify({ employees: result.rows })
    };

  } catch (err) {
    console.error("❌ Error in get_employees.js:", err.message);
    return {
      statusCode: 401,
      body: JSON.stringify({ message: "Unauthorized or session invalid", error: err.message })
    };
  }
};
