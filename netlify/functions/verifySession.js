const jwt = require('jsonwebtoken');
const cookie = require('cookie');

module.exports = function verify(event) {
  const rawCookie = event.headers.cookie || '';
  console.log("🔍 Raw Cookie Header:", rawCookie);  // DEBUG

  const cookies = cookie.parse(rawCookie);
  const token = cookies.nikagenyx_session;

  if (!token) {
    console.log("❌ No nikagenyx_session token found.");
    throw new Error('No token');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token decoded:", decoded);  // DEBUG
    return decoded;
  } catch (err) {
    console.error("❌ Invalid token:", err.message);
    throw new Error('Invalid token');
  }
};
