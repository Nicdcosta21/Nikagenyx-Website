const { Pool } = require("pg");

const verify = require('./verifySession');
try { verify(event); } catch { return { statusCode: 401 }; }

const pool = new Pool({ connectionString: process.env.NETLIFY_DATABASE_URL, ssl: { rejectUnauthorized: false } });

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ message: "Method Not Allowed" }) };
  }

  try {
    const { emp_id } = JSON.parse(event.body);
    if (!emp_id) return { statusCode: 400, body: JSON.stringify({ message: "emp_id required" }) };

    const res = await pool.query(
      `SELECT date, clock_in, clock_out,
       ROUND(EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600, 2) AS total_hours
       FROM attendance
       WHERE emp_id = $1 ORDER BY date DESC LIMIT 30`,
      [emp_id]
    );

    return { statusCode: 200, body: JSON.stringify({ attendance: res.rows }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: "Server error", error: err.message }) };
  }
};
