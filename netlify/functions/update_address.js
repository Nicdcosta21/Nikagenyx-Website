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
    const data = JSON.parse(event.body || "{}");
    const {
      emp_id,
      line1,
      line2,
      line3,
      country,
      state,
      district,
      pincode,
    } = data;

    if (!emp_id || !line1 || !line2 || !country || !state || !district || !pincode) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required address fields" }),
      };
    }

    const query = `
      UPDATE employees SET
        address_line1 = $1,
        address_line2 = $2,
        address_line3 = $3,
        country = $4,
        state = $5,
        district = $6,
        pincode = $7
      WHERE emp_id = $8
    `;
    const values = [line1, line2, line3 || "", country, state, district, pincode, emp_id];

    await pool.query(query, values);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Address updated successfully" }),
    };
  } catch (err) {
    console.error("Update address error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: err.message }),
    };
  }
};
