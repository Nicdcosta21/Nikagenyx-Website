const { IncomingForm } = require("formidable");
const { Pool } = require("pg");
const { Readable } = require("stream");

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
        multiples: false,
      });

      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error("Form parse error:", err);
          return resolve({ statusCode: 500, body: "Form parsing failed" });
        }

        try {
          const { emp_id, phone, dob, department, role, new_pin } = fields;
          console.log("Received fields:", fields);

          if (!emp_id) {
            return resolve({ statusCode: 400, body: "Missing emp_id" });
          }

          // Update query logic here – make sure your SQL handles nullable fields
          await pool.query(
            `UPDATE employees SET phone = $1, dob = $2, department = $3, role = $4, pin = COALESCE(NULLIF($5, ''), pin) WHERE emp_id = $6`,
            [phone || null, dob || null, department || null, role || null, new_pin || '', emp_id]
          );

          resolve({
            statusCode: 200,
            body: JSON.stringify({ message: "Profile updated successfully" }),
          });
        } catch (dbErr) {
          console.error("Database update error:", dbErr);
          resolve({ statusCode: 500, body: "Database update failed" });
        }
      });
    });

  } catch (err) {
    console.error("Outer handler error:", err);
    return {
      statusCode: 500,
      body: "Unhandled server error",
    };
  }
};
