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

    if (admin_id !== "NGX001") {
      if (!token) {
        await db.end();
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Missing MFA token" })
        };
      }

      const admin = await db.query("SELECT mfa_secret FROM employees WHERE emp_id = $1", [admin_id]);
      if (!admin.rowCount) {
        await db.end();
        return { statusCode: 403, body: JSON.stringify({ message: "Admin not found" }) };
      }

      const verified = speakeasy.totp.verify({
        secret: admin.rows[0].mfa_secret,
        encoding: "base32",
        token
      });

      if (!verified) {
        await db.end();
        return { statusCode: 401, body: JSON.stringify({ message: "MFA verification failed" }) };
      }
    }

    const updates = [];
    const values = [];
    let index = 1;

    if (name) {
      updates.push(`name = $${index++}`);
      values.push(name);
    }
    if (phone) {
      updates.push(`phone = $${index++}`);
      values.push(phone);
    }
    if (dob) {
      updates.push(`dob = $${index++}`);
      values.push(dob);
    }
    if (role) {
      updates.push(`role = $${index++}`);
      values.push(role);
    }
    if (department) {
      updates.push(`department = $${index++}`);
      values.push(department);
    }
    if (base_salary) {
      updates.push(`base_salary = $${index++}`);
      values.push(base_salary);
    }

    if (updates.length === 0) {
      await db.end();
      return { statusCode: 400, body: JSON.stringify({ message: "Nothing to update" }) };
    }

    values.push(emp_id);
    const query = `UPDATE employees SET ${updates.join(", ")} WHERE emp_id = $${index}`;
    await db.query(query, values);
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
