const { Pool } = require('pg');
const speakeasy = require('speakeasy');

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  try {
    const { emp_id, token } = JSON.parse(event.body || '{}');

    if (!emp_id || !token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing emp_id or token' }),
      };
    }

    const result = await pool.query(
      'SELECT mfa_secret FROM employees WHERE emp_id = $1',
      [emp_id]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Employee not found' }),
      };
    }

    const secret = result.rows[0].mfa_secret;

    if (!secret) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'MFA not set up for this user' }),
      };
    }

    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!isValid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid MFA token' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Token verified' }),
    };

  } catch (err) {
    console.error('MFA validation error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Server Error', error: err.message }),
    };
  }
};
