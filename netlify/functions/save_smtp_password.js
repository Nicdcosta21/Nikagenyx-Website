const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { emp_id, smtp_password } = JSON.parse(event.body || "{}");

  if (!emp_id || !smtp_password) {
    return { statusCode: 400, body: "Missing fields" };
  }

  try {
    const client = await pool.connect();
    await client.query(
      "UPDATE employees SET smtp_password = $1 WHERE emp_id = $2",
      [smtp_password, emp_id]
    );
    client.release();

    return { statusCode: 200, body: JSON.stringify({ message: "Password saved" }) };
  } catch (err) {
    console.error("DB error:", err);
    return { statusCode: 500, body: "Failed to save password" };
  }
};
