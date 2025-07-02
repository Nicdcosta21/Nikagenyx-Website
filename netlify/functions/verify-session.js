const verify = require('./verifySession');

exports.handler = async (event) => {
  try {
    const payload = verify(event);
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        emp_id: payload.emp_id,
        role: payload.role,
        message: "Session valid"
      })
    };
  } catch (err) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        ok: false,
        message: "Invalid session"
      })
    };
  }
};