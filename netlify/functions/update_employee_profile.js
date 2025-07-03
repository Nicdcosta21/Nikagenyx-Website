const { Pool } = require("pg");
const speakeasy = require("speakeasy");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const {
      emp_id,
      name,
      phone,
      dob,
      role,
      department,
      base_salary,
      token,
      admin_id
    } = JSON.parse(event.body || "{}");

    if (!emp_id || !admin_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing emp_id or admin_id" })
      };
    }

    const db = new Pool({
      connectionString: process.env.NETLIFY_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    // If not NGX001, perform MFA check
    if (admin_id !== "NGX001") {
      if (!token) {
        await db.end();
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "MFA token required" })
        };
      }

      const admin = await db.query("SELECT mfa_secret FROM employees WHERE emp_id = $1", [admin_id]);
      if (!admin.rowCount) {
        await db.end();
        return {
          statusCode: 403,
          body: JSON.stringify({ message: "Admin not found" })
        };
      }

      const verified = speakeasy.totp.verify({
        secret: admin.rows[0].mfa_secret,
        encoding: "base32",
        token
      });

      if (!verified) {
        await db.end();
        return {
          statusCode: 401,
          body: JSON.stringify({ message: "MFA verification failed" })
        };
      }
    }

    await db.query(
      `UPDATE employees SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        dob = COALESCE($3, dob),
        role = COALESCE($4, role),
        department = COALESCE($5, department),
        base_salary = COALESCE($6, base_salary)
      WHERE emp_id = $7`,
      [
        name || null,
        phone || null,
        dob || null,
        role || null,
        department || null,
        base_salary || null,
        emp_id
      ]
    );

    await db.end();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Profile updated successfully" })
    };
  } catch (err) {
    console.error("❌ Update error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error while updating profile" })
    };
  }
};
