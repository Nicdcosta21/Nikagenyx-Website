const { Pool } = require("pg");
const speakeasy = require("speakeasy");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method Not Allowed" };

  const { emp_id } = JSON.parse(event.body || "{}");
  if (!emp_id) return { statusCode: 400, body: "Missing emp_id" };

  const db = new Pool({ connectionString: process.env.NETLIFY_DATABASE_URL, ssl: { rejectUnauthorized: false } });

  const { rows } = await db.query("SELECT failed_mfa_attempts FROM employees WHERE emp_id = $1", [emp_id]);
  if (!rows.length || rows[0].failed_mfa_attempts < 3)
    return { statusCode: 403, body: "MFA reset not allowed" };

  const secret = speakeasy.generateSecret();
  await db.query("UPDATE employees SET mfa_secret=$1, failed_mfa_attempts=0 WHERE emp_id=$2", [secret.base32, emp_id]);
  await db.end();

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "MFA reset",
      qr_code_url: secret.otpauth_url,
      secret_key: secret.base32
    })
  };
};
