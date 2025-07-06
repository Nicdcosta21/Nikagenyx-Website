const { Pool } = require('pg');
const verify = require('./verifySession'); // JWT session check

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
    const user = verify(event); // Ensure it's an admin
    if (!user || user.role !== 'admin') {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: 'Forbidden: Admin access required' })
      };
    }

    const { emp_id, privilege } = JSON.parse(event.body || '{}');
    if (!emp_id || !privilege) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing emp_id or privilege' })
      };
    }

    await pool.query(
      'UPDATE employees SET privilege = $1 WHERE emp_id = $2',
      [privilege, emp_id]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Privilege updated successfully' })
    };
  } catch (err) {
    console.error('❌ update_privilege.js error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Server Error', error: err.message })
    };
  }
};
