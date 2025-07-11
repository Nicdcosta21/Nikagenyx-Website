const { Pool } = require("pg");
const speakeasy = require("speakeasy");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method Not Allowed" };

  const { admin_id, token } = JSON.parse(event.body || "{}");
  if (!admin_id || !token) return { statusCode: 400, body: "Missing data" };

  const db = new Pool({ connectionString: process.env.NETLIFY_DATABASE_URL, ssl: { rejectUnauthorized: false } });

  const result = await db.query("SELECT mfa_secret FROM employees WHERE emp_id = $1", [admin_id]);
  await db.end();

  if (!result.rowCount) return { statusCode: 404, body: "Admin not found" };

  const secret = result.rows[0].mfa_secret;

  const verified = speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token
  });

  return { statusCode: 200, body: JSON.stringify({ valid: verified }) };
};
