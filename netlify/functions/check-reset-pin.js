const { Pool } = require("pg");

exports.handler = async (event) => {
  const emp_id = event.queryStringParameters.emp_id;
  if (!emp_id) return { statusCode: 400, body: "Missing emp_id" };

  const db = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const { rows } = await db.query("SELECT reset_pin_ready FROM employees WHERE emp_id = $1", [emp_id]);
    if (!rows.length) return { statusCode: 404, body: "Employee not found" };

    return {
      statusCode: 200,
      body: JSON.stringify({ reset_pin_ready: rows[0].reset_pin_ready }),
    };
  } catch (err) {
    console.error("Error:", err);
    return { statusCode: 500, body: "Internal server error" };
  } finally {
    await db.end();
  }
};
