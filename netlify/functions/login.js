const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const { serialize } = require('cookie');

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  try {
    const { empId, pin } = JSON.parse(event.body || '{}');

    if (!empId || !pin) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing empId or pin' }),
      };
    }

    const result = await pool.query(
      'SELECT emp_id, role FROM employees WHERE emp_id=$1 AND pin=$2',
      [empId, pin]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Bad credentials' }),
      };
    }

    const user = result.rows[0];
    const token = jwt.sign(
      { emp_id: user.emp_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Optional: Save session in DB for tracking (if table exists)
    /*
    await pool.query(
      `INSERT INTO sessions (emp_id, token, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + interval '2 hours')`,
      [
        user.emp_id,
        token,
        event.headers['user-agent'] || 'unknown',
        event.headers['x-forwarded-for'] || 'localhost'
      ]
    );
    */

    return {
      statusCode: 200,
      headers: {
        'Set-Cookie': serialize('nikagenyx_session', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Strict',
          path: '/',
          maxAge: 60 * 60 * 2, // 2 hours
        }),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ok: true, user }),
    };
  } catch (error) {
    console.error('❌ Login error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  } finally {
    await pool.end();
  }
};
