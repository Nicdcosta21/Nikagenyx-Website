const verify = require('./verifySession');

exports.handler = async (event) => {
  try {
    const user = verify(event);
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        emp_id: user.empId,
        message: "Session is valid"
      })
    };
  } catch {
    return {
      statusCode: 401,
      body: JSON.stringify({
        ok: false,
        message: "Invalid or expired session"
      })
    };
  }
};
