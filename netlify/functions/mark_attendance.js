const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ message: "Method Not Allowed" }) };
  }

  try {
    const { emp_id, type } = JSON.parse(event.body);
    if (!emp_id || !type) {
      return { statusCode: 400, body: JSON.stringify({ message: "Missing parameters" }) };
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    const existing = await pool.query(
      "SELECT * FROM attendance WHERE emp_id = $1 AND date = $2",
      [emp_id, today]
    );

    if (type === "in") {
      if (existing.rows.length > 0 && existing.rows[0].clock_in) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "Already clocked in.",
            timestamp: existing.rows[0].clock_in,
            type: "in"
          })
        };
      }

      await pool.query(
        "INSERT INTO attendance (emp_id, date, clock_in) VALUES ($1, $2, $3) ON CONFLICT (emp_id, date) DO UPDATE SET clock_in = $3",
        [emp_id, today, now]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Clocked in successfully.",
          timestamp: now,
          type: "in"
        })
      };
    }

    if (type === "out") {
      if (existing.rows.length === 0 || existing.rows[0].clock_out) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "Already clocked out or not clocked in yet.",
            timestamp: existing.rows[0]?.clock_out || null,
            type: "out"
          })
        };
      }

     await pool.query(
  "UPDATE attendance SET clock_out = $1, updated_at = NOW() WHERE emp_id = $2 AND date = $3",
  [now, emp_id, today]
);

      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Clocked out successfully.",
          timestamp: now,
          type: "out"
        })
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid action." })
    };

  } catch (err) {
    console.error("❌ Error in mark_attendance:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal error", error: err.message })
    };
  }
};
