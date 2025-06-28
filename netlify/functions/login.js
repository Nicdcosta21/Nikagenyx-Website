const { Client } = require('pg');

exports.handler = async function (event) {
  const { empId, pin } = JSON.parse(event.body);

  const client = new Client({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const result = await client.query(
      'SELECT * FROM employees WHERE emp_id = $1 AND pin = $2',
      [empId, pin]
    );

    await client.end();

    if (result.rows.length > 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: "success", user: result.rows[0] }),
      };
    } else {
      return {
        statusCode: 401,
        body: JSON.stringify({ status: "fail", message: "Invalid login" }),
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
