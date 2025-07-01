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
      'SELECT emp_id, role FROM employees WHERE emp_id = $1 AND pin = $2',
      [empId, pin]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid ID or PIN' }),
      };
    }

    const user = result.rows[0];

    const token = jwt.sign(
      { emp_id: user.emp_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    // ✅ Insert session tracking into DB
    try {
      await pool.query(
        `INSERT INTO sessions (emp_id, token, user_agent, ip_address, created_at, expires_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW() + interval '2 hours')`,
        [
          user.emp_id,
          token,
          event.headers['user-agent'] || 'unknown',
          event.headers['x-forwarded-for'] || '127.0.0.1'
        ]
      );
    } catch (dbErr) {
      console.error("❌ Failed to log session:", dbErr);
    }

    return {
      statusCode: 200,
      headers: {
        'Set-Cookie': serialize('nikagenyx_session', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Strict',
          path: '/',
          maxAge: 60 * 60 * 2,
        }),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ok: true,
        user: {
          emp_id: user.emp_id,
          role: user.role
        }
      }),
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
