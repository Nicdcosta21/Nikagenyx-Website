const { Pool } = require("pg");
const speakeasy = require("speakeasy");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method Not Allowed" };

  const { emp_id, name, phone, dob, role, department, base_salary, token, admin_id } = JSON.parse(event.body || "{}");

  if (!emp_id || !token || !admin_id) return { statusCode: 400, body: "Missing data" };

  const db = new Pool({ connectionString: process.env.NETLIFY_DATABASE_URL, ssl: { rejectUnauthorized: false } });

  const admin = await db.query("SELECT mfa_secret FROM employees WHERE emp_id = $1", [admin_id]);
  if (!admin.rowCount) return { statusCode: 403, body: "Admin not found" };

  const verified = speakeasy.totp.verify({
    secret: admin.rows[0].mfa_secret,
    encoding: "base32",
    token
  });

  if (!verified) return { statusCode: 401, body: "MFA failed" };

  await db.query(
    `UPDATE employees SET name=$1, phone=$2, dob=$3, role=$4, department=$5, base_salary=$6 WHERE emp_id=$7`,
    [name, phone, dob, role, department, base_salary, emp_id]
  );
  await db.end();

  return { statusCode: 200, body: JSON.stringify({ message: "Profile updated successfully" }) };
};
