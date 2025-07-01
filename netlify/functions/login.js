const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const { serialize } = require('cookie');

exports.handler = async (event) => {
  try {
    const { empId, pin } = JSON.parse(event.body || '{}');

    const db = new Pool({
      connectionString: process.env.NETLIFY_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    // Select emp_id and role for frontend session
    const { rows } = await db.query(
      'SELECT emp_id, role FROM employees WHERE emp_id=$1 AND pin=$2',
      [empId, pin]
    );
    await db.end();

    if (!rows.length) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Bad credentials' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    const user = rows[0];

    const token = jwt.sign({ empId: user.emp_id }, process.env.JWT_SECRET, {
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
          maxAge: 60 * 60 * 2,
        }),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ok: true, user }),
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};
