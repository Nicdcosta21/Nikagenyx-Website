const { IncomingForm } = require("formidable");
const { Pool } = require("pg");

// PostgreSQL pool setup
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  console.log("Received event:", {
    method: event.httpMethod,
    isBase64Encoded: event.isBase64Encoded,
    headers: event.headers,
  });

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  // Test DB connection upfront
  try {
    await pool.query("SELECT 1");
    console.log("✅ Database connection OK");
  } catch (dbConnErr) {
    console.error("❌ Database connection failed:", dbConnErr);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Database connection failed",
        error: dbConnErr.message,
      }),
    };
  }

  const bodyBuffer = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body);

  return new Promise((resolve) => {
    const form = new IncomingForm({ maxFileSize: 1024 * 1024 }); // max 1MB

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

        console.log("Parsed fields:", fields);
        console.log("Parsed files:", Object.keys(files));

        const { emp_id, phone, dob, role, department, new_pin } = fields;

        if (!emp_id) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ message: "Missing employee ID" }),
          });
        }

        // For debugging: Return parsed data without DB update
        // Uncomment below to test form parsing alone
        /*
        return resolve({
          statusCode: 200,
          body: JSON.stringify({
            message: "Form parsed successfully",
            fields,
            files: Object.keys(files),
          }),
        });
        */

        // Proceed with DB update only after confirming parsing is OK
        try {
          const updates = [];
          const values = [];
          let index = 1;

          if (phone?.trim()) {
            updates.push(`phone = $${index++}`);
            values.push(phone.trim());
          }
          if (dob?.trim()) {
            updates.push(`dob = $${index++}`);
            values.push(dob.trim());
          }
          if (role?.trim()) {
            updates.push(`role = $${index++}`);
            values.push(role.trim());
          }
          if (department?.trim()) {
            updates.push(`department = $${index++}`);
            values.push(department.trim());
          }
          if (new_pin?.trim()) {
            updates.push(`pin = $${index++}`);
            values.push(new_pin.trim());
          }

          if (updates.length === 0) {
            return resolve({
              statusCode: 400,
              body: JSON.stringify({ message: "No valid fields provided for update" }),
            });
          }

          values.push(emp_id.trim());
          const query = `UPDATE employees SET ${updates.join(", ")} WHERE emp_id = $${index}`;

          console.log("Executing query:", query);
          console.log("With values:", values);

          await pool.query(query, values);

          resolve({
            statusCode: 200,
            body: JSON.stringify({ message: "Profile updated successfully" }),
          });
        } catch (dbErr) {
          console.error("❌ Database update error:", dbErr);
          resolve({
            statusCode: 500,
            body: JSON.stringify({ message: "Database error", error: dbErr.message }),
          });
        }
      }
    );
  });
};
