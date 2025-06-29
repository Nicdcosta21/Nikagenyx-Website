const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async () => {
  try {
    const { rows } = await pool.query(`SELECT mode FROM payroll_mode LIMIT 1`);
    const mode = rows[0]?.mode || "freelance";
    return {
      statusCode: 200,
      body: JSON.stringify({ mode }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch payroll mode" }),
    };
  }
};
