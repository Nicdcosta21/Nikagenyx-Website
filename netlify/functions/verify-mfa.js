const { Pool } = require("pg");
const speakeasy = require("speakeasy");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { emp_id, token, secret, is_reset_flow } = JSON.parse(event.body || '{}');

    if (!emp_id || !token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing emp_id or token" })
      };
    }

    const db = new Pool({
      connectionString: process.env.NETLIFY_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    // Get employee's MFA secret
    const result = await db.query(
      "SELECT mfa_secret, failed_mfa_attempts FROM employees WHERE emp_id = $1",
      [emp_id]
    );

    if (!result.rows.length) {
      await db.end();
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Employee not found" })
      };
    }

    const employee = result.rows[0];

    // Check if MFA is locked
    if (employee.failed_mfa_attempts >= 3) {
      await db.end();
      return {
        statusCode: 423,
        body: JSON.stringify({ message: "MFA locked. Contact admin." })
      };
    }

    // Use provided secret for reset flow, otherwise use stored secret
    const mfaSecret = is_reset_flow ? secret : employee.mfa_secret;

    if (!mfaSecret) {
      await db.end();
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "MFA not set up" })
      };
    }

    // Clean the token (remove any whitespace)
    const cleanToken = token.toString().trim();

    // Verify the token with multiple attempts for better compatibility
    let verified = false;

    // Try with different window sizes and token formats
    for (let window = 1; window <= 3; window++) {
      verified = speakeasy.totp.verify({
        secret: mfaSecret,
        encoding: "base32",
        token: cleanToken,
        window: window
      });

      if (verified) break;
    }

    if (verified) {
      // Reset failed attempts on successful verification
      await db.query(
        "UPDATE employees SET failed_mfa_attempts = 0 WHERE emp_id = $1",
        [emp_id]
      );

      await db.end();
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: "MFA verified successfully",
          verified: true 
        })
      };
    } else {
      // Increment failed attempts
      await db.query(
        "UPDATE employees SET failed_mfa_attempts = failed_mfa_attempts + 1 WHERE emp_id = $1",
        [emp_id]
      );

      const newAttempts = employee.failed_mfa_attempts + 1;

      await db.end();
      return {
        statusCode: 401,
        body: JSON.stringify({ 
          message: newAttempts >= 3 ? "Invalid MFA token. Account locked." : "Invalid MFA token",
          verified: false,
          attempts_remaining: Math.max(0, 3 - newAttempts)
        })
      };
    }

  } catch (error) {
    console.error("MFA verification error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" })
    };
  }
};
