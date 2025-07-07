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

    // 🔍 Fetch full employee including failed_pin_attempts
    body: JSON.stringify({
  ok: true,
  user: {
    emp_id: user.emp_id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    dob: user.dob,
    department: user.department,
    base_salary: user.base_salary,
    role: user.role,
    failed_pin_attempts: 0
  }
})


    if (result.rows.length === 0) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid ID or PIN' }),
      };
    }

    const user = result.rows[0];

    // 🧠 Validate PIN match (use plain equality for now, but you can hash later)
    if (user.pin !== pin) {
      await pool.query(
        'UPDATE employees SET failed_pin_attempts = failed_pin_attempts + 1 WHERE emp_id = $1',
        [empId]
      );

      return {
        statusCode: 401,
        body: JSON.stringify({
          message: 'Invalid ID or PIN',
          failed_pin_attempts: user.failed_pin_attempts + 1, // to reflect post-increment state
        }),
      };
    }

    // ✅ Correct PIN: reset failed attempts
    await pool.query(
      'UPDATE employees SET failed_pin_attempts = 0 WHERE emp_id = $1',
      [user.emp_id]
    );

    // ✅ Generate session token
    const token = jwt.sign(
      { emp_id: user.emp_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    // ✅ Log session
    await pool.query(
      `INSERT INTO sessions (emp_id, token, user_agent, ip_address, created_at, expires_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW() + interval '2 hours')`,
      [
        user.emp_id,
        token,
        event.headers['user-agent'] || 'unknown',
        event.headers['x-forwarded-for'] || '127.0.0.1',
      ]
    );

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
    name: user.name,
    email: user.email,
    phone: user.phone,
    dob: user.dob,
    department: user.department,
    base_salary: user.base_salary,
    role: user.role, // comes from privilege AS role
    failed_pin_attempts: 0
  }
})
    };

  } catch (error) {
    console.error('❌ Login error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
