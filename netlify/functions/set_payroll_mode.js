const { Pool } = require('pg');

const verify = require('./verifySession');
try { verify(event); } catch { return { statusCode: 401 }; }

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { mode } = JSON.parse(event.body);
    if (!["freelance", "fulltime"].includes(mode)) {
      return { statusCode: 400, body: "Invalid mode" };
    }

    const existing = await pool.query("SELECT id FROM payroll_mode LIMIT 1");
    if (existing.rows.length > 0) {
      await pool.query("UPDATE payroll_mode SET mode = $1 WHERE id = $2", [mode, existing.rows[0].id]);
    } else {
      await pool.query("INSERT INTO payroll_mode (mode) VALUES ($1)", [mode]);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Payroll mode updated to ${mode}` }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
