const { Pool } = require('pg');
const speakeasy = require('speakeasy');

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  try {
    const { empId, code } = JSON.parse(event.body || '{}');

    if (!empId || !code) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: 'Employee ID and MFA code are required.' }),
      };
    }

    // Bypass MFA for NGX001 (super admin)
    if (empId.trim().toUpperCase() === 'NGX001') {
      console.log('✅ MFA bypassed for NGX001');
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: 'MFA bypassed for first admin' }),
      };
    }

    const result = await pool.query(
      'SELECT mfa_secret FROM employees WHERE emp_id = $1',
      [empId]
    );

    const mfaSecret = result.rows[0]?.mfa_secret;

    if (!mfaSecret) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: 'MFA secret not found for this user' }),
      };
    }

    const verified = speakeasy.totp.verify({
      secret: mfaSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: 'Invalid MFA token' }),
      };
    }

    console.log(`✅ MFA verified for: ${empId}`);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: 'MFA verified successfully' }),
    };

  } catch (err) {
    console.error('❌ MFA Verification Error:', err.message);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: 'Internal Server Error', error: err.message }),
    };
  }
};
