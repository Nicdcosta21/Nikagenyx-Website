const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  try {
    const { emp_id, name, phone, dob, role, department } = JSON.parse(event.body);
    if (!emp_id || !name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "emp_id and name are required." }),
      };
    }

    await pool.query(
      `UPDATE employees SET name=$1, phone=$2, dob=$3, role=$4, department=$5 WHERE emp_id=$6`,
      [name, phone, dob, role, department, emp_id]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Profile updated successfully" }),
    };
  } catch (err) {
    console.error("❌ Update error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: err.message }),
    };
  }
};
