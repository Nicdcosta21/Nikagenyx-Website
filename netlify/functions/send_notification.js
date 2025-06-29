const { Pool } = require('pg');

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
    const { target, message } = JSON.parse(event.body);

    if (!message || !target) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing target or message' })
      };
    }

    const sql = `
      INSERT INTO notifications (emp_id, message, timestamp)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
    `;

    if (target.toLowerCase() === 'all') {
      const result = await pool.query(`SELECT emp_id FROM employees`);
      for (const row of result.rows) {
        await pool.query(sql, [row.emp_id, message]);
      }
    } else {
      await pool.query(sql, [target, message]);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: '✅ Notification sent.' })
    };

  } catch (err) {
    console.error('Notification error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal error', error: err.message })
    };
  }
};
