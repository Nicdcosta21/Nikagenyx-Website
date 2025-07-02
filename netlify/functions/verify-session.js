// File: netlify/functions/verify-session.js

const verify = require('./verifySession');

exports.handler = async (event) => {
  try {
    const user = verify(event); // { emp_id, role }
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        emp_id: user.emp_id,
        role: user.role,
        message: "Session is valid"
      })
    };
  } catch (err) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        ok: false,
        message: "Invalid or expired session"
      })
    };
  }
};
