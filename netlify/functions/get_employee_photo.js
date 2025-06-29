// netlify/functions/get_employee_photo.js

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

    if (!emp_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "emp_id is required." }),
      };
    }

    const client = new Client({
      connectionString: process.env.POSTGRES_URL, // make sure this is set in Netlify env
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();

    const result = await client.query(
      "SELECT photo_base64 FROM employees WHERE emp_id = $1",
      [emp_id]
    );

    await client.end();

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Employee not found." }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ photo_base64: result.rows[0].photo_base64 }),
    };
  } catch (err) {
    console.error("❌ DB Error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal error", error: err.message }),
    };
  }
};
