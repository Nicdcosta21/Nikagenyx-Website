const { Pool } = require('pg');


const verify = require('./verifySession');
try { verify(event); } catch { return { statusCode: 401 }; }

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  try {
    const { emp_id } = JSON.parse(event.body);
    if (!emp_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing emp_id' })
      };
    }

    const today = new Date().toISOString().slice(0, 10);

    const { rows } = await pool.query(
      `SELECT * FROM attendance WHERE emp_id = $1 AND date = $2`,
      [emp_id, today]
    );

    if (rows.length === 0) {
      // Not clocked in yet
      await pool.query(
        `INSERT INTO attendance (emp_id, clock_in) VALUES ($1, CURRENT_TIME)`,
        [emp_id]
      );
      return {
        statusCode: 200,
        body: JSON.stringify({ message: '✅ Clocked in successfully.' })
      };
    }

    const row = rows[0];
    if (!row.clock_out) {
      // Clock out now
      await pool.query(
        `UPDATE attendance SET clock_out = CURRENT_TIME WHERE id = $1`,
        [row.id]
      );
      return {
        statusCode: 200,
        body: JSON.stringify({ message: '✅ Clocked out successfully.' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: '❗ Already clocked in and out today.' })
    };

  } catch (err) {
    console.error('Clock in/out error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal error', error: err.message })
    };
  }
};
