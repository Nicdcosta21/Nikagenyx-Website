const { Pool } = require("pg");
const speakeasy = require("speakeasy");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method Not Allowed" };

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

    if (!emp_id || !name || !phone || !dob || !role || !department || !base_salary) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required fields" })
      };
    }

    // Allow NGX001 to skip MFA
    if (admin_id !== "NGX001") {
      if (!token || !admin_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Missing MFA token or admin ID" })
        };
      }

      const db = new Pool({
        connectionString: process.env.NETLIFY_DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });

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

      await db.query(
        `UPDATE employees SET name=$1, phone=$2, dob=$3, role=$4, department=$5, base_salary=$6 WHERE emp_id=$7`,
        [name, phone, dob, role, department, base_salary, emp_id]
      );

      await db.end();
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Profile updated successfully" })
      };
    } else {
      // No MFA for NGX001
      const db = new Pool({
        connectionString: process.env.NETLIFY_DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });

      await db.query(
        `UPDATE employees SET name=$1, phone=$2, dob=$3, role=$4, department=$5, base_salary=$6 WHERE emp_id=$7`,
        [name, phone, dob, role, department, base_salary, emp_id]
      );

      await db.end();
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Profile updated successfully" })
      };
    }
  } catch (err) {
    console.error("❌ Update error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error while updating profile" })
    };
  }
};
