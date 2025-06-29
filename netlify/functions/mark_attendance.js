const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { emp_id } = JSON.parse(event.body);
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const { rows } = await pool.query("SELECT * FROM attendance WHERE emp_id=$1 AND date=$2", [emp_id, today]);

    if (rows.length === 0) {
      await pool.query("INSERT INTO attendance (emp_id, date, clock_in) VALUES ($1, $2, $3)", [emp_id, today, now]);
      return {
        statusCode: 200,
        body: JSON.stringify({ status: "clocked_in", message: "Clock In recorded." })
      };
    }

    const existing = rows[0];
    if (!existing.clock_out) {
      await pool.query("UPDATE attendance SET clock_out=$1 WHERE emp_id=$2 AND date=$3", [now, emp_id, today]);
      return {
        statusCode: 200,
        body: JSON.stringify({ status: "clocked_out", message: "Clock Out recorded." })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ status: "complete", message: "You already clocked in and out today." })
    };

  } catch (err) {
    console.error("❌ Attendance error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
