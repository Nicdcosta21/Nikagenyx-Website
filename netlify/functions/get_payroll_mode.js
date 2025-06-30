const { Pool } = require('pg');

const verify = require('./verifySession');
try { verify(event); } catch { return { statusCode: 401 }; }

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async () => {
  try {
    const result = await pool.query("SELECT mode FROM payroll_mode LIMIT 1");
    const mode = result.rows[0]?.mode || 'freelance';
    return {
      statusCode: 200,
      body: JSON.stringify({ mode }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
