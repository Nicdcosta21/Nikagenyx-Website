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
    const result = await pool.query(
      'SELECT * FROM notifications WHERE emp_id=$1 ORDER BY created_at DESC',
      [empId]
    );
    return {
      statusCode: 200,
      body: JSON.stringify(result.rows),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  } finally {
    await pool.end();
  }
};