const { Pool } = require('pg');
const verify = require('./verifySession');
try { verify(event); } catch { return { statusCode: 401 }; }

exports.handler = async (event) => {
  const { empId } = JSON.parse(event.body || '{}');

  const pool = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pool.query(
      'UPDATE employees SET mfa_secret=NULL WHERE emp_id=$1',
      [empId]
    );
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  } finally {
    await pool.end();
  }
};