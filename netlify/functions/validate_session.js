const verify = require('./verifySession'); // assumes this returns decoded token or throws

exports.handler = async (event) => {
  try {
    const user = verify(event); // should throw if token is invalid/expired

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        emp_id: user.emp_id || user.empId,
        role: user.role || null,
        message: "Session is valid"
      })
    };
  } catch (err) {
    console.error("🔐 Session verification failed:", err.message || err);

    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        message: "Invalid or expired session"
      })
    };
  }
};
