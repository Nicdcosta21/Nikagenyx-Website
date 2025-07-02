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
    console.log("📦 Decoded token:", decoded);
    if (!decoded.emp_id || !decoded.role) {
      throw new Error('Missing required fields in token');
    }
    return decoded;
  } catch (err) {
    console.error("🔐 JWT verification failed:", err.message || err);
    throw new Error('Invalid or expired session token');
  }
};