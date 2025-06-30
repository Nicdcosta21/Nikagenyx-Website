const { Pool } = require('pg');


const verify = require('./verifySession');
try { verify(event); } catch { return { statusCode: 401 }; }

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
    console.error("DB Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to fetch employees", error: err.message })
    };
  }
};
