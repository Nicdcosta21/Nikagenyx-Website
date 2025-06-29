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
    const { emp_id } = JSON.parse(event.body);
    if (!emp_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "emp_id is required" }),
      };
    }

    const result = await pool.query(
      "SELECT photo_base64 FROM employees WHERE emp_id = $1",
      [emp_id]
    );

    if (result.rowCount === 0 || !result.rows[0].photo_base64) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Photo not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        photo_base64: result.rows[0].photo_base64.replace(/^data:image\/[a-z]+;base64,/, "")
      }),
    };
  } catch (err) {
    console.error("❌ DB Error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal error", error: err.message }),
    };
  }
};
