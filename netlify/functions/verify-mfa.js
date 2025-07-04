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
    const { emp_id, token, secret, is_reset_flow } = JSON.parse(event.body || '{}');

    // Handle MFA reset flow (when secret is provided)
    if (is_reset_flow && secret) {
      const isValid = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token
      });

      if (!isValid) {
        return {
          statusCode: 401,
          body: JSON.stringify({ 
            message: 'Invalid MFA token',
            verified: false
          })
        };
      }

      // Update the employee's MFA secret and reset attempts
      await pool.query(
        'UPDATE employees SET mfa_secret = $1, failed_mfa_attempts = 0 WHERE emp_id = $2',
        [secret, emp_id]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: '✅ MFA reset and verified successfully',
          verified: true
        })
      };
    }

    // Normal MFA verification flow
    if (!emp_id || !token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing emp_id or token' })
      };
    }

    // Fetch the admin's MFA secret and failed attempts
    const result = await pool.query(
      'SELECT mfa_secret, failed_mfa_attempts FROM employees WHERE emp_id = $1',
      [emp_id]
    );

    if (result.rowCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Admin not found' })
      };
    }

    const { mfa_secret, failed_mfa_attempts } = result.rows[0];

    if (!mfa_secret) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: 'MFA not setup for this admin' })
      };
    }

    // Optional: Lockout logic
    if (failed_mfa_attempts >= 3) {
      return {
        statusCode: 423,
        body: JSON.stringify({ message: 'Account temporarily locked due to too many failed MFA attempts' })
      };
    }

    const isValid = speakeasy.totp.verify({
      secret: mfa_secret,
      encoding: 'base32',
      token
    });

    if (!isValid) {
      await pool.query(
        'UPDATE employees SET failed_mfa_attempts = failed_mfa_attempts + 1 WHERE emp_id = $1',
        [emp_id]
      );
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid MFA token' })
      };
    }

    // Reset failed attempts on success
    await pool.query(
      'UPDATE employees SET failed_mfa_attempts = 0 WHERE emp_id = $1',
      [emp_id]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: '✅ MFA verified successfully',
        verified: true
      })
    };

  } catch (err) {
    console.error("MFA verification error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Server error during MFA verification',
        verified: false
      })
    };
  } finally {
    await pool.end();
  }
};
