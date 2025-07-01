const jwt = require('jsonwebtoken');
const cookie = require('cookie');

module.exports = function verify(event) {
  const rawCookie =
    event.headers.cookie || event.headers.Cookie || '';

  const cookies = cookie.parse(rawCookie || '');
  const token = cookies.nikagenyx_session;

  if (!token) {
    console.warn("❌ No session token found in cookies");
    throw new Error("No session token found");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Session verified for:", decoded.empId || 'Unknown');
    return decoded;
  } catch (err) {
    console.error("❌ Invalid or expired session:", err.message);
    throw new Error("Invalid or expired session token");
  }
};
