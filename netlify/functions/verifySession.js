const jwt = require('jsonwebtoken');
const cookie = require('cookie');

module.exports = function verify(event) {
  const rawCookie = event.headers.cookie || '';
  console.log("🍪 Raw Cookie:", rawCookie);

  const cookies = cookie.parse(rawCookie);
  const token = cookies.nikagenyx_session;

  if (!token) {
    console.log("❌ No token found");
    throw new Error("No token");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Decoded JWT:", decoded);
    return decoded;
  } catch (err) {
    console.error("❌ JWT Verification Failed:", err.message);
    throw new Error("Invalid token");
  }
};
