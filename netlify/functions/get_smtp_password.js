const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  const emp_id = event.queryStringParameters.emp_id;
  if (!emp_id) {
    return { statusCode: 400, body: "Missing emp_id" };
  }

  try {
    const client = await pool.connect();
    const { rows } = await client.query(
      "SELECT smtp_password FROM employees WHERE emp_id = $1",
      [emp_id]
    );
    client.release();

    const password = rows[0]?.smtp_password || null;
    return {
      statusCode: 200,
      body: JSON.stringify({ smtp_password: password }),
    };
  } catch (err) {
    console.error("DB error:", err);
    return { statusCode: 500, body: "Server error" };
  }
};
