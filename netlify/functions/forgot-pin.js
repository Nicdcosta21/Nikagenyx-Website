const { Pool } = require("pg");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method Not Allowed" };

  const { empId } = JSON.parse(event.body || "{}");
  if (!empId) return { statusCode: 400, body: "Missing Employee ID" };

  const db = new Pool({ connectionString: process.env.NETLIFY_DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    const { rows } = await db.query("SELECT email FROM employees WHERE emp_id = $1", [empId]);

    if (!rows.length)
      return { statusCode: 404, body: "Employee not found" };

    const email = rows[0].email;

    // ❗️Optional: Generate temp PIN or reset link logic here
    // For now, just simulate email notification
    console.log(`Simulated email: "Reset your PIN" sent to ${email}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Reset email sent." }),
    };
  } catch (error) {
    console.error("Forgot PIN error:", error);
    return { statusCode: 500, body: "Internal Server Error" };
  } finally {
    await db.end();
  }
};
