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
    console.log("📩 Received emp_id:", emp_id);

    if (!emp_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "emp_id is required." }),
      };
    }

    const client = new Client({
      connectionString: process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    console.log("✅ Connected to database");

    const result = await client.query(
      "SELECT photo_base64 FROM employees WHERE emp_id = $1",
      [emp_id]
    );

    await client.end();

    if (result.rows.length === 0) {
      console.warn("⚠️ No employee found with emp_id:", emp_id);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Employee not found." }),
      };
    }

    const photo = result.rows[0].photo_base64;
    if (!photo || !photo.startsWith("data:image/")) {
      console.warn("⚠️ Invalid or empty photo_base64 for:", emp_id);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "No valid photo found for employee." }),
      };
    }

    console.log("✅ Photo retrieved for", emp_id);
    return {
      statusCode: 200,
      body: JSON.stringify({ photo_base64: photo }),
    };

  } catch (err) {
    console.error("❌ Error fetching employee photo:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error", error: err.message }),
    };
  }
};
