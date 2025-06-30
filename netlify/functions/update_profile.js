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

  // Decode body according to base64 flag
  const bodyBuffer = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body);

  return new Promise((resolve) => {
    const form = new IncomingForm({ maxFileSize: 1024 * 1024, allowEmptyFiles: true }); // 1MB max, allow empty files

    form.parse(
      {
        headers: event.headers,
        method: event.httpMethod,
        url: event.path,
        rawBody: bodyBuffer,
      },
      async (err, fields, files) => {
        if (err) {
          console.error("❌ Form parse failed:", err);
          return resolve({
            statusCode: 500,
            body: JSON.stringify({ error: "Form parse failed", message: err.message }),
          });
        }

        const { emp_id } = fields;
        if (!emp_id) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ message: "Missing employee ID" }),
          });
        }

        try {
          const updates = [];
          const values = [];
          let index = 1;

          // Update only non-empty text fields
          ["phone", "dob", "role", "department", "new_pin"].forEach((field) => {
            if (fields[field] && fields[field].trim() !== "") {
              updates.push(`${field === "new_pin" ? "pin" : field} = $${index++}`);
              values.push(fields[field].trim());
            }
          });

          // Update file name fields if file size > 0 and within 1MB limit
          ["pan", "aadhaar", "resume", "qualification", "photo", "passport"].forEach((fileField) => {
            const file = files[fileField];
            if (file && file.size > 0 && file.size <= 1024 * 1024) {
              updates.push(`${fileField}_filename = $${index++}`);
              values.push(file.originalFilename || "");
            }
          });

          if (updates.length === 0) {
            // Nothing to update, return success anyway
            return resolve({
              statusCode: 200,
              body: JSON.stringify({ message: "Nothing to update, no changes made." }),
            });
          }

          values.push(emp_id.trim());
          const query = `UPDATE employees SET ${updates.join(", ")} WHERE emp_id = $${index}`;

          await pool.query(query, values);

          resolve({
            statusCode: 200,
            body: JSON.stringify({ message: "Profile updated successfully" }),
          });
        } catch (dbErr) {
          console.error("❌ Database error:", dbErr);
          resolve({
            statusCode: 500,
            body: JSON.stringify({ message: "Database error", error: dbErr.message }),
          });
        }
      }
    );
  });
};
