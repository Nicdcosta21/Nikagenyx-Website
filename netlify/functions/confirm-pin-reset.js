const { Pool } = require("pg");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method Not Allowed" };

  const { empId, newPin } = JSON.parse(event.body || "{}");
  if (!empId || !newPin) {
    return { statusCode: 400, body: "Missing empId or newPin" };
  }

  const db = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await db.query(
      "UPDATE employees SET pin = $1, failed_pin_attempts = 0, reset_pin_ready = false WHERE emp_id = $2",
      [newPin, empId]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "PIN updated successfully" }),
    };
  } catch (err) {
    console.error("Error:", err);
    return { statusCode: 500, body: "Failed to update PIN" };
  } finally {
    await db.end();
  }
};
