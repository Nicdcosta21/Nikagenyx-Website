const { Pool } = require('pg');
const verify = require('./verifySession');

exports.handler = async (event) => {
  let session;
  try {
    session = verify(event); // Extract empId from JWT
  } catch {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Unauthorized: Invalid or missing session" }),
    };
  }

  const pool = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const query = `
      SELECT emp_id, name, role, department, phone, dob, base_salary
      FROM employees
      WHERE emp_id = $1
    `;
    const result = await pool.query(query, [session.empId]);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Employee not found" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.rows[0]),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Failed to fetch employee", error: err.message }),
    };
  } finally {
    await pool.end(); // ✅ always close pool
  }
};
