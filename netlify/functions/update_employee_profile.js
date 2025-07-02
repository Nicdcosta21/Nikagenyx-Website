const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { emp_id, name, phone, dob, role, department, base_salary } = data;

    console.log("🔄 Update request received:", data);

    if (!emp_id || !name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Employee ID and Name are required." }),
      };
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
    if (base_salary !== undefined) {
      updates.push(`base_salary = $${index++}`);
      values.push(parseInt(base_salary));
    }

    if (updates.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "No fields to update." }),
      };
    }

    values.push(emp_id);
    const query = `UPDATE employees SET ${updates.join(", ")} WHERE emp_id = $${index}`;
    await pool.query(query, values);
    await pool.end(); // ✅ Important!

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Profile updated successfully" }),
    };

  } catch (err) {
    console.error("❌ Update error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: err.message }),
    };
  }
};
