const { Pool } = require("pg");
const speakeasy = require("speakeasy");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ message: "Method Not Allowed" }) 
    };
  }

  let db;
  
  try {
    const { emp_id, token, secret, is_reset_flow } = JSON.parse(event.body || '{}');

    console.log("MFA verification request:", { emp_id, token: token ? "***" : null, is_reset_flow });

    if (!emp_id || !token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: "Missing employee ID or MFA token",
          verified: false 
        })
      };
    }

    db = new Pool({
      connectionString: process.env.NETLIFY_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    // Get employee's MFA secret and current attempt count
    const result = await db.query(
      "SELECT mfa_secret, failed_mfa_attempts, name FROM employees WHERE emp_id = $1",
      [emp_id]
    );

    if (!result.rows.length) {
      console.log("Employee not found:", emp_id);
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          message: "Employee not found",
          verified: false 
        })
      };
    }

    const employee = result.rows[0];
    console.log("Employee found:", { emp_id, name: employee.name, has_secret: !!employee.mfa_secret });

    // Check if account is locked
    if (employee.failed_mfa_attempts >= 3) {
      console.log("Account locked for:", emp_id);
      return {
        statusCode: 423,
        body: JSON.stringify({ 
          message: "Account locked due to too many failed attempts. Contact admin.",
          verified: false 
        })
      };
    }

    // Determine which secret to use
    const mfaSecret = is_reset_flow ? secret : employee.mfa_secret;

    if (!mfaSecret) {
      console.log("No MFA secret available for:", emp_id);
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: "MFA not set up for this account",
          verified: false 
        })
      };
    }

    // Clean and validate token
    const cleanToken = token.toString().trim().replace(/\s/g, '');
    
    if (!/^\d{6}$/.test(cleanToken)) {
      console.log("Invalid token format:", cleanToken);
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: "Invalid token format. Must be 6 digits.",
          verified: false 
        })
      };
    }

    console.log("Attempting to verify token with secret length:", mfaSecret.length);

    // Verify the token with extended time window for better reliability
    let verified = false;
    let usedWindow = 0;

    // Try verification with increasing time windows
    for (let window = 0; window <= 2; window++) {
      try {
        verified = speakeasy.totp.verify({
          secret: mfaSecret,
          encoding: "base32",
          token: cleanToken,
          window: window,
          step: 30
        });

        if (verified) {
          usedWindow = window;
          console.log(`Token verified with window ${window}`);
          break;
        }
      } catch (verifyError) {
        console.error(`Verification error with window ${window}:`, verifyError);
      }
    }

    if (verified) {
      // Reset failed attempts on successful verification
      await db.query(
        "UPDATE employees SET failed_mfa_attempts = 0 WHERE emp_id = $1",
        [emp_id]
      );

      console.log("MFA verification successful for:", emp_id);

      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: "MFA verified successfully",
          verified: true,
          window_used: usedWindow
        })
      };
    } else {
      // Increment failed attempts
      const newAttempts = employee.failed_mfa_attempts + 1;
      
      await db.query(
        "UPDATE employees SET failed_mfa_attempts = $1 WHERE emp_id = $2",
        [newAttempts, emp_id]
      );

      console.log(`MFA verification failed for ${emp_id}. Attempts: ${newAttempts}`);

      const attemptsRemaining = Math.max(0, 3 - newAttempts);
      const isLocked = newAttempts >= 3;

      return {
        statusCode: 401,
        body: JSON.stringify({ 
          message: isLocked 
            ? "Invalid MFA token. Account is now locked. Contact admin." 
            : `Invalid MFA token. ${attemptsRemaining} attempts remaining.`,
          verified: false,
          attempts_remaining: attemptsRemaining,
          locked: isLocked
        })
      };
    }

  } catch (error) {
    console.error("MFA verification error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: "Internal server error during MFA verification",
        verified: false,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

