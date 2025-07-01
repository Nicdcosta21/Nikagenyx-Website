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
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  try {
    const { empId, code } = JSON.parse(event.body);

    // Bypass MFA for the very first user
    if (empId === 'NGX001') {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'MFA bypassed for first admin' })
      };
    }

    const result = await pool.query(
      'SELECT mfa_secret FROM employees WHERE emp_id = $1',
      [empId]
    );

    if (result.rows.length === 0 || !result.rows[0].mfa_secret) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'MFA secret not found for this user' })
      };
    }

    const verified = speakeasy.totp.verify({
      secret: result.rows[0].mfa_secret,
      encoding: 'base32',
      token: code,
      window: 1
    });

    if (!verified) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid MFA token' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'MFA verified successfully' })
    };

  } catch (err) {
    console.error('❌ MFA Verification Error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error', error: err.message })
    };
  }
};
