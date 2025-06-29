const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  try {
    const { mode } = JSON.parse(event.body);

    if (!["freelance", "fulltime"].includes(mode)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid mode" }),
      };
    }

    await pool.query(`
      INSERT INTO payroll_mode (mode)
      VALUES ($1)
      ON CONFLICT (id) DO UPDATE SET mode = $1;
    `, [mode]);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Payroll mode set to ${mode}` }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to set payroll mode" }),
    };
  }
};
