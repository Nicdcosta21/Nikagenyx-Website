const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" })
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { emp_id, phone, dob, department, pin } = data;

    if (!emp_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Employee ID is required." })
      };
    }

    const updates = [];
    const values = [];
    let index = 1;

    if (phone) {
      updates.push(`phone = $${index++}`);
      values.push(phone);
    }

    if (dob) {
      updates.push(`dob = $${index++}`);
      values.push(dob);
    }

    if (department) {
      updates.push(`department = $${index++}`);
      values.push(department);
    }

    if (pin) {
      updates.push(`pin = $${index++}`);
      values.push(pin);
    }

    if (updates.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "No fields to update." })
      };
    }

    values.push(emp_id); // for WHERE clause

    const query = `UPDATE employees SET ${updates.join(", ")} WHERE emp_id = $${index}`;
    await pool.query(query, values);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Profile updated successfully." })
    };

  } catch (err) {
    console.error("❌ Profile update error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: err.message })
    };
  }
};
