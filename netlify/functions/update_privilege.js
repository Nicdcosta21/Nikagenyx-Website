// .netlify/functions/update_privilege.js
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

exports.handler = async (event) => {
  const { emp_id, privilege } = JSON.parse(event.body);

  if (!emp_id || !privilege) {
    return { statusCode: 400, body: "Missing parameters." };
  }

  try {
    await pool.query("UPDATE employees SET privilege = $1 WHERE emp_id = $2", [privilege, emp_id]);
    return { statusCode: 200, body: "Privilege updated." };
  } catch (err) {
    return { statusCode: 500, body: "Database error." };
  }
};
