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
    const data = JSON.parse(event.body || "{}");

    const {
      emp_id,
      name,
      phone = "",
      dob = "",
      department = "",
      role = "",
      base_salary = 0
    } = data;

    if (!emp_id || !name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing emp_id or name" }),
      };
    }

    const query = `
      UPDATE employees SET
        name = CASE WHEN $1 = '' THEN name ELSE $1 END,
        phone = CASE WHEN $2 = '' THEN phone ELSE $2 END,
        dob = CASE WHEN $3 = '' THEN dob ELSE $3::DATE END,
        department = CASE WHEN $4 = '' THEN department ELSE $4 END,
        role = CASE WHEN $5 = '' THEN role ELSE $5 END,
        base_salary = CASE WHEN $6::int = 0 THEN base_salary ELSE $6::int END
      WHERE emp_id = $7
    `;

    const values = [name, phone, dob, department, role, base_salary, emp_id];
    await pool.query(query, values);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Profile updated for ${emp_id}` }),
    };
  } catch (err) {
    console.error("Update failed:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: err.message }),
    };
  }
};
