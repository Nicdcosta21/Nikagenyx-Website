const jwt = require('jsonwebtoken');
const cookie = require('cookie');

module.exports = function verify(event) {
  const cookies = cookie.parse(event.headers.cookie || '');
  const token = cookies.nikagenyx_session;

  if (!token) {
    throw new Error('No session token found');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded; // e.g. { emp_id: "NGX001", role: "admin", iat: ..., exp: ... }
  } catch (err) {
    console.error("🔐 JWT verification error:", err.message || err);
    throw new Error('Invalid or expired session token');
  }
};
