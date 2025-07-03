const { Pool } = require("pg");
const jwt = require("jsonwebtoken");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method Not Allowed" };

  const { emp_id } = JSON.parse(event.body || "{}");
  if (!emp_id) return { statusCode: 400, body: "Missing emp_id" };

  const db = new Pool({ connectionString: process.env.NETLIFY_DATABASE_URL, ssl: { rejectUnauthorized: false } });

  await db.query("DELETE FROM employees WHERE emp_id = $1", [emp_id]);
  await db.end();

  return { statusCode: 200, body: JSON.stringify({ message: "Employee deleted successfully" }) };
};
