const { Pool } = require('pg');
const verify = require('./verifySession');

exports.handler = async (event) => {
  let session;
  try {
    session = verify(event); // Extract empId from JWT
  } catch {
    return { statusCode: 401 };
  }

  const pool = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query(
      'SELECT emp_id, name, role, department, phone, dob, base_salary FROM employees WHERE emp_id = $1',
      [session.empId]
    );

    if (result.rows.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ message: "Employee not found" }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result.rows[0]) // 👈 return single user object
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to fetch employee", error: err.message })
    };
  } finally {
    await pool.end();
  }
};
