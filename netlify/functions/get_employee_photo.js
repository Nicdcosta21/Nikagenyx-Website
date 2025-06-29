const { Client } = require("pg");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  try {
    const { emp_id } = JSON.parse(event.body);
    console.log("📩 Incoming request for emp_id:", emp_id);

    if (!emp_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "emp_id is required" }),
      };
    }

    // ✅ Use Netlify's environment variable
    const dbUrl = process.env.NETLIFY_DATABASE_URL;

    if (!dbUrl) {
      console.error("❌ Environment variable NETLIFY_DATABASE_URL is not set.");
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Database URL is not configured." }),
      };
    }

    const client = new Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log("✅ Connected to database");

    const query = "SELECT photo_base64 FROM employees WHERE emp_id = $1";
    const result = await client.query(query, [emp_id]);

    await client.end();

    if (result.rows.length === 0) {
      console.warn("⚠️ No employee found with emp_id:", emp_id);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Employee not found." }),
      };
    }

    const photo_base64 = result.rows[0].photo_base64;

    if (!photo_base64 || !photo_base64.startsWith("data:image/")) {
      console.warn("⚠️ No valid image found for:", emp_id);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "No valid photo found for employee." }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ photo_base64 }),
    };

  } catch (err) {
    console.error("❌ Server error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal Server Error",
        error: err.message
      }),
    };
  }
};
