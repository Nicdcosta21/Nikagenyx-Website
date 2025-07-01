const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" })
    };
  }

  try {
    const { emp_id, action } = JSON.parse(event.body);
    if (!emp_id || !["clock_in", "clock_out"].includes(action)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid or missing fields" })
      };
    }

    const timestamp = new Date().toISOString();
    await pool.query(
      "INSERT INTO attendance (emp_id, action, timestamp) VALUES ($1, $2, $3)",
      [emp_id, action, timestamp]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `✅ ${action.replace('_', ' ')} recorded successfully.` })
    };
  } catch (err) {
    console.error("❌ Clock error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" })
    };
  }
};
