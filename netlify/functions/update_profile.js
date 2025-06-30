const { IncomingForm } = require("formidable");
const { Pool } = require("pg");

// Configure PostgreSQL connection pool
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

  console.log("Event.isBase64Encoded:", event.isBase64Encoded);

  // Decode body depending on encoding (Netlify may send base64 or plain)
  const bodyBuffer = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body);

  return new Promise((resolve) => {
    const form = new IncomingForm({ maxFileSize: 1024 * 1024 }); // 1MB limit

    form.parse(
      {
        headers: event.headers,
        method: event.httpMethod,
        url: event.path,
        buffer: bodyBuffer,
      },
      async (err, fields, files) => {
        if (err) {
          console.error("❌ Form parsing failed:", err);
          return resolve({
            statusCode: 500,
            body: JSON.stringify({
              message: "Form parsing failed",
              error: err.message,
            }),
          });
        }

        try {
          const { emp_id, phone, dob, role, department, new_pin } = fields;

          if (!emp_id) {
            return resolve({
              statusCode: 400,
              body: JSON.stringify({ message: "Missing employee ID" }),
            });
          }

          const updates = [];
          const values = [];
          let i = 1;

          if (phone) {
            updates.push(`phone = $${i++}`);
            values.push(phone);
          }
          if (dob) {
            updates.push(`dob = $${i++}`);
            values.push(dob);
          }
          if (role) {
            updates.push(`role = $${i++}`);
            values.push(role);
          }
          if (department) {
            updates.push(`department = $${i++}`);
            values.push(department);
          }
          if (new_pin) {
            updates.push(`pin = $${i++}`);
            values.push(new_pin);
          }

          if (updates.length === 0) {
            return resolve({
              statusCode: 400,
              body: JSON.stringify({ message: "No fields to update" }),
            });
          }

          values.push(emp_id);
          const query = `UPDATE employees SET ${updates.join(
            ", "
          )} WHERE emp_id = $${i}`;
          await pool.query(query, values);

          resolve({
            statusCode: 200,
            body: JSON.stringify({ message: "Profile updated successfully" }),
          });
        } catch (error) {
          console.error("❌ Database update error:", error);
          resolve({
            statusCode: 500,
            body: JSON.stringify({ message: "Database error", error: error.message }),
          });
        }
      }
    );
  });
};
