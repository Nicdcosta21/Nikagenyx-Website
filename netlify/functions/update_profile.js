const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ message: "Method Not Allowed" }) };
  }

  try {
    const { emp_id, phone, dob, department, pin } = JSON.parse(event.body);
    if (!emp_id || !phone || !dob) {
      return { statusCode: 400, body: JSON.stringify({ message: "Missing required fields" }) };
    }

    const updates = [];
    const values = [];
    let idx = 1;

    if (phone) { updates.push(`phone = $${idx++}`); values.push(phone); }
    if (dob) { updates.push(`dob = $${idx++}`); values.push(dob); }
    if (department) { updates.push(`department = $${idx++}`); values.push(department); }
    if (pin) { updates.push(`pin = $${idx++}`); values.push(pin); }

    values.push(emp_id); // Last value for WHERE clause

    const query = `UPDATE employees SET ${updates.join(", ")} WHERE emp_id = $${idx}`;
    await pool.query(query, values);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Profile updated successfully" })
    };
  } catch (err) {
    console.error("❌ Profile update error:", err.message);
    return { statusCode: 500, body: JSON.stringify({ message: "Server error", error: err.message }) };
  }
};
