const { Pool } = require('pg');
const verify = require('./verifySession'); // 🔐 JWT-based session verification

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
    const user = verify(event); // 🔐 Parse session token

    // 🚫 Only allow admins
    if (!user || user.role !== 'admin') {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Forbidden: Admin access required" })
      };
    }

    // ✅ Query all employees, mapping employment_role as 'role'
    const result = await pool.query(`
      SELECT 
        emp_id, 
        name, 
        email,              
        phone, 
        dob, 
        department, 
        employment_role AS employment_role, 
        base_salary,
        privilege 
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
      body: JSON.stringify({
        message: "Unauthorized or session invalid",
        error: err.message
      })
    };
  }
};
