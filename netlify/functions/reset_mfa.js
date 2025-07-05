const { Pool } = require('pg');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  let db;

  try {
    const { emp_id } = JSON.parse(event.body || '{}');

    if (!emp_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing employee ID' })
      };
    }

    db = new Pool({
      connectionString: process.env.NETLIFY_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    // Verify employee exists first
    const empCheck = await db.query(
      'SELECT emp_id, name FROM employees WHERE emp_id = $1',
      [emp_id]
    );

    if (!empCheck.rows.length) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Employee not found' })
      };
    }

    const employee = empCheck.rows[0];

    // Generate new MFA secret
    const secret = speakeasy.generateSecret({
      name: `Nikagenyx (${employee.name || emp_id})`,
      issuer: 'Nikagenyx',
      length: 32
    });

    console.log("Generated new MFA secret for:", emp_id);

    // Generate QR code
    const qr_code_url = await QRCode.toDataURL(secret.otpauth_url);

    // Update employee record with new secret and reset failed attempts
    const updateResult = await db.query(
      'UPDATE employees SET mfa_secret = $1, failed_mfa_attempts = 0 WHERE emp_id = $2',
      [secret.base32, emp_id]
    );

    if (updateResult.rowCount === 0) {
      throw new Error('Failed to update employee MFA secret');
    }

    console.log("Successfully reset MFA for:", emp_id);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'MFA reset successfully',
        qr_code_url,
        secret_key: secret.base32,
        emp_id: emp_id
      })
    };

  } catch (err) {
    console.error('MFA reset error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Server error during MFA reset',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      })
    };
  } finally {
    if (db) {
      try {
        await db.end();
      } catch (closeError) {
        console.error("Error closing database connection:", closeError);
      }
    }
  }
};
