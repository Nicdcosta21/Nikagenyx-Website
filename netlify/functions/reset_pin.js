const { Pool } = require("pg");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method Not Allowed" };

  const { emp_id } = JSON.parse(event.body || "{}");
  if (!emp_id) return { statusCode: 400, body: "Missing emp_id" };

  const db = new Pool({ connectionString: process.env.NETLIFY_DATABASE_URL, ssl: { rejectUnauthorized: false } });

  const { rows } = await db.query("SELECT failed_pin_attempts FROM employees WHERE emp_id = $1", [emp_id]);
  if (!rows.length || rows[0].failed_pin_attempts < 3)
    return { statusCode: 403, body: "PIN reset not allowed" };

  await db.query("UPDATE employees SET failed_pin_attempts = 0 WHERE emp_id = $1", [emp_id]);
  await db.end();

  return { statusCode: 200, body: JSON.stringify({ message: "PIN reset by admin. Please refresh the page to continue." }) };
};
