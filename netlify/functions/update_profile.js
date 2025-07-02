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
        maxFileSize: 1024 * 1024,
        maxTotalFileSize: 5 * 1024 * 1024,
        allowEmptyFiles: true,
         minFileSize: 0,
        multiples: false,
      });

      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error("Form parse error:", err);
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ error: "Form parse failed", message: err.message }),
          });
        }

        const unwrap = (obj) => {
          const out = {};
          for (const key in obj) {
            out[key] = Array.isArray(obj[key]) ? obj[key][0] : obj[key];
          }
          return out;
        };

        const f = unwrap(fields);

        const emp_id     = f.emp_id || null;
        const phone      = f.phone || null;
        const dob        = f.dob || null;
        const department = f.department || null;
        const role       = f.role || null;
        const new_pin    = f.new_pin || '';
        const email      = f.email || null;

        console.log("Received fields:", f);

        if (!emp_id) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ message: "Missing employee ID" }),
          });
        }

        if (email && email.trim() !== '' && !/^[\w\.-]+@[\w\.-]+\.\w{2,}$/.test(email)) {
  return resolve({
    statusCode: 400,
    body: JSON.stringify({ message: "Invalid email format" }),
  });
}


        try {
          const query = `
  UPDATE employees SET
    phone = CASE WHEN $1 = '' THEN phone ELSE $1 END,
    dob = CASE WHEN $2 = '' THEN dob ELSE $2::DATE END,
    department = CASE WHEN $3 = '' THEN department ELSE $3 END,
    role = CASE WHEN $4 = '' THEN role ELSE $4 END,
    pin = CASE WHEN $5 = '' THEN pin ELSE $5 END,
    email = CASE WHEN $6 = '' THEN email ELSE $6 END
  WHERE emp_id = $7
`;
const values = [phone, dob, department, role, new_pin, email, emp_id];


          await pool.query(query, values);

          return resolve({
            statusCode: 200,
            body: JSON.stringify({ message: "Profile updated successfully" }),
          });

        } catch (dbErr) {
          console.error("Database update error:", dbErr);
          return resolve({
            statusCode: 500,
            body: JSON.stringify({ error: "Database update failed", message: dbErr.message }),
          });
        }
      });
    });

  } catch (err) {
    console.error("Outer handler error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Unhandled server error", message: err.message }),
    };
  }
};
