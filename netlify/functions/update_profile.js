const { IncomingForm } = require("formidable");
const { Pool } = require("pg");
const { Readable } = require("stream");

// PostgreSQL pool
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
        maxFileSize: 1024 * 1024,          // 1MB per file
        maxTotalFileSize: 5 * 1024 * 1024, // 5MB total
        allowEmptyFiles: true,
        multiples: false,
      });

      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error("Form parse error:", err);
          return resolve({
            statusCode: 400,
            body: JSON.stringify({
              error: "Form parse failed",
              message: err.message,
            }),
          });
        }

        // Auto-unwrapping helper: converts { key: [val] } to { key: val }
        const unwrap = (obj) => {
          const out = {};
          for (const key in obj) {
            out[key] = Array.isArray(obj[key]) ? obj[key][0] : obj[key];
          }
          return out;
        };

        const f = unwrap(fields); // flattened field values

        const emp_id    = f.emp_id || null;
        const phone     = f.phone || null;
        const dob       = f.dob || null;
        const department= f.department || null;
        const role      = f.role || null;
        const new_pin   = f.new_pin || '';

        console.log("Received fields:", f);

        if (!emp_id) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ message: "Missing employee ID" }),
          });
        }

        try {
          const query = `
            UPDATE employees SET
              phone = COALESCE(NULLIF($1, ''), phone),
              dob = COALESCE(NULLIF($2, ''), dob),
              department = COALESCE(NULLIF($3, ''), department),
              role = COALESCE(NULLIF($4, ''), role),
              pin = COALESCE(NULLIF($5, ''), pin)
            WHERE emp_id = $6
          `;

          const values = [phone, dob, department, role, new_pin, emp_id];

          await pool.query(query, values);

          return resolve({
            statusCode: 200,
            body: JSON.stringify({ message: "Profile updated successfully" }),
          });

        } catch (dbErr) {
          console.error("Database update error:", dbErr);
          return resolve({
            statusCode: 500,
            body: JSON.stringify({
              error: "Database update failed",
              message: dbErr.message,
            }),
          });
        }
      });
    });

  } catch (err) {
    console.error("Outer handler error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Unhandled server error",
        message: err.message,
      }),
    };
  }
};
