// netlify/functions/update_profile.js
const { Pool } = require('pg');
const formidable = require('formidable');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false, maxFileSize: 512 * 1024 }); // 500KB max

    form.parse(event, async (err, fields, files) => {
      if (err) {
        console.error("❌ Form parsing error:", err);
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ message: "File upload error", error: err.message }),
        });
      }

      try {
        const { emp_id, phone, dob, department, new_pin, role } = fields;

        if (!emp_id || !phone || !dob) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ message: "Required fields missing" }),
          });
        }

        const updates = [];
        const values = [];
        let idx = 1;

        if (phone)        { updates.push(`phone = $${idx++}`); values.push(phone); }
        if (dob)          { updates.push(`dob = $${idx++}`); values.push(dob); }
        if (department)   { updates.push(`department = $${idx++}`); values.push(department); }
        if (role)         { updates.push(`role = $${idx++}`); values.push(role); }
        if (new_pin)      { updates.push(`pin = $${idx++}`); values.push(new_pin); }

        // ✅ Handle passport-size photo upload
        if (files.photo && files.photo.filepath) {
          const fileBuffer = fs.readFileSync(files.photo.filepath);
          const base64 = fileBuffer.toString('base64');
          updates.push(`photo_base64 = $${idx++}`);
          values.push(base64);
        }

        values.push(emp_id); // WHERE clause
        const query = `UPDATE employees SET ${updates.join(", ")} WHERE emp_id = $${idx}`;

        await pool.query(query, values);

        resolve({
          statusCode: 200,
          body: JSON.stringify({ message: "Profile updated successfully" }),
        });
      } catch (e) {
        console.error("❌ Update failed:", e.message);
        resolve({
          statusCode: 500,
          body: JSON.stringify({ message: "Server error", error: e.message }),
        });
      }
    });
  });
};
