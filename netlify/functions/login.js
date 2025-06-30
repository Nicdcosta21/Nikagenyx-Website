const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const { serialize } = require('cookie');

exports.handler = async (event) => {
  const { empId, pin } = JSON.parse(event.body || '{}');

  const db = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const { rows } = await db.query(
    'SELECT emp_id FROM employees WHERE emp_id=$1 AND pin=$2',
    [empId, pin]
  );
  await db.end();

  if (!rows.length) {
    return {
      statusCode: 401,
      body: 'Bad credentials',
    };
  }

  const token = jwt.sign({ empId: rows[0].emp_id }, process.env.JWT_SECRET, {
    expiresIn: '2h',
  });

  return {
    statusCode: 200,
    headers: {
      'Set-Cookie': serialize('nikagenyx_session', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        path: '/',
        maxAge: 60 * 60 * 2, // 2 hours
      }),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ok: true }),
  };
};
