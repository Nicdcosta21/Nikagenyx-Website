const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  const empId = event.queryStringParameters?.emp_id;
  if (!empId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Employee ID is required" }),
    };
  }

  try {
    const res = await pool.query("SELECT * FROM employees WHERE emp_id = $1", [empId]);
    if (res.rowCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Employee not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(res.rows[0]),
    };
  } catch (err) {
    console.error("Error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: err.message }),
    };
  }
};
