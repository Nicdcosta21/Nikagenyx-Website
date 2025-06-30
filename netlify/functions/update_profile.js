const { Pool } = require('pg');
const verify = require('./verifySession');
try { verify(event); } catch { return { statusCode: 401 }; }

exports.handler = async (event) => {
  const { empId, phone, dob, department } = JSON.parse(event.body || '{}');

  const pool = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pool.query(
      'UPDATE employees SET phone=$1, dob=$2, department=$3 WHERE emp_id=$4',
      [phone, dob, department, empId]
    );
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  } finally {
    await pool.end();
  }
};