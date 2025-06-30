const { Pool } = require('pg');
const verify = require('./verifySession');
try { verify(event); } catch { return { statusCode: 401 }; }

exports.handler = async (event) => {
  const pool = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const { rows } = await pool.query('SELECT * FROM employees');
    return {
      statusCode: 200,
      body: JSON.stringify(rows),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  } finally {
    await pool.end();
  }
};