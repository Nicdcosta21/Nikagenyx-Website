const { IncomingForm } = require("formidable");
const { Readable } = require("stream");
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

  const bodyBuffer = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body);

  const mockReq = new Readable();
  mockReq.push(bodyBuffer);
  mockReq.push(null);
  mockReq.headers = event.headers;
  mockReq.method = event.httpMethod;
  mockReq.url = event.path;

  return new Promise((resolve) => {
    const form = new IncomingForm({ maxFileSize: 1024 * 1024, allowEmptyFiles: true, minFileSize: 0 });

    form.parse(mockReq, async (err, fields, files) => {
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
        let idx = 1;

        // Text fields update
        ["phone", "dob", "role", "department", "new_pin"].forEach((field) => {
          if (typeof fields[field] === "string" && fields[field].trim() !== "") {
          updates.push(`${field === "new_pin" ? "pin" : field} = $${idx++}`);
          values.push(fields[field].trim());
        }
      });

        // File fields - store filename references in DB
        ["pan", "aadhaar", "resume", "qualification", "photo", "passport"].forEach(fileField => {
          if (files[fileField] && files[fileField].originalFilename && files[fileField].size > 0) {
            updates.push(`${fileField}_filename = $${idx++}`);
            values.push(files[fileField].originalFilename);
          }
        });

        if (updates.length === 0) {
          return resolve({
            statusCode: 200,
            body: JSON.stringify({ message: "No changes detected." }),
          });
        }

        values.push(emp_id.trim());
        const query = `UPDATE employees SET ${updates.join(", ")} WHERE emp_id = $${idx}`;
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
    });
  });
};
