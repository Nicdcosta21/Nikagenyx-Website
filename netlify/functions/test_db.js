const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "DB connected", time: res.rows[0].now }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "DB connection failed", error: error.message }),
    };
  }
};
