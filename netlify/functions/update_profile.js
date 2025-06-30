const { IncomingForm } = require("formidable");
const { Pool } = require("pg");
const { Readable } = require("stream");

// PostgreSQL connection pool
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

  // Convert body buffer to stream for formidable
  const bodyBuffer = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body);

  const req = new Readable();
  req.push(bodyBuffer);
  req.push(null);
  req.headers = event.headers;
  req.method = event.httpMethod;
  req.url = event.path;

  return new Promise((resolve) => {
    const form = new IncomingForm({
      maxFileSize: 1024 * 1024,  // 1MB max
      allowEmptyFiles: true,
      minFileSize: 0,
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("❌ Form parse failed:", err);
        return resolve({
          statusCode: 400,
          body: JSON.stringify({ error: "Form parse failed", message: err.message }),
        });
      }

      console.log("Parsed fields:", fields);
      console.log("Parsed files:", Object.keys(files));

      const { emp_id } = fields;
      if (!emp_id || typeof emp_id !== "string" || emp_id.trim() === "") {
        return resolve({
          statusCode: 400,
          body: JSON.stringify({ message: "Missing or invalid employee ID" }),
        });
      }

      try {
        const updates = [];
        const values = [];
        let idx = 1;

        // Only add non-empty text fields to update
        ["phone", "dob", "role", "department", "new_pin"].forEach((field) => {
          if (fields[field] && typeof fields[field] === "string" && fields[field].trim() !== "") {
            updates.push(`${field === "new_pin" ? "pin" : field} = $${idx++}`);
            values.push(fields[field].trim());
          }
        });

        // For files, save filenames if file uploaded and size > 0
        ["pan", "aadhaar", "resume", "qualification", "photo", "passport"].forEach((fileField) => {
          if (files[fileField] && files[fileField].size > 0) {
            updates.push(`${fileField}_filename = $${idx++}`);
            values.push(files[fileField].originalFilename || "");
            // Optional: handle actual file storage or processing here
          }
        });

        if (updates.length === 0) {
          // Nothing to update, return success anyway
          return resolve({
            statusCode: 200,
            body: JSON.stringify({ message: "No changes detected. Profile not updated." }),
          });
        }

        values.push(emp_id.trim());
        const query = `UPDATE employees SET ${updates.join(", ")} WHERE emp_id = $${idx}`;

        console.log("Executing query:", query);
        console.log("With values:", values);

        const result = await pool.query(query, values);
        console.log("DB update rowCount:", result.rowCount);

        if (result.rowCount === 0) {
          return resolve({
            statusCode: 404,
            body: JSON.stringify({ message: "No employee found with the given ID" }),
          });
        }

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
