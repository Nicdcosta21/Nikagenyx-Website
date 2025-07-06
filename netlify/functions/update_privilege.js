// /.netlify/functions/update_privilege.js
const { db } = require('../../db'); // Or however you connect to your DB

exports.handler = async (event) => {
  const { emp_id, privilege } = JSON.parse(event.body);

  if (!emp_id || !privilege) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing emp_id or privilege" })
    };
  }

  try {
    await db.query(`UPDATE employees SET privilege = $1 WHERE emp_id = $2`, [privilege, emp_id]);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Privilege updated successfully" })
    };
  } catch (err) {
    console.error("❌ DB Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to update privilege" })
    };
  }
};
