// File: netlify/functions/verifySession.js

const jwt = require('jsonwebtoken');
const cookie = require('cookie');

/**
 * Verifies JWT from session cookie.
 * Throws error if not valid.
 * @param {object} event - Netlify function event
 * @returns {object} - Decoded token payload (e.g., { emp_id, role })
 */
module.exports = function verify(event) {
  const cookies = cookie.parse(event.headers.cookie || '');
  const token = cookies.nikagenyx_session;

  if (!token) {
    throw new Error('No session token found');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.emp_id || !decoded.role) {
      throw new Error('Missing required fields in token');
    }
    return decoded;
  } catch (err) {
    console.error("🔐 JWT verification failed:", err.message || err);
    throw new Error('Invalid or expired session token');
  }
};
