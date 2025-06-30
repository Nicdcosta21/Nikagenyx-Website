const jwt = require('jsonwebtoken');
const cookie = require('cookie');

module.exports = function verify(event) {
  const cookies = cookie.parse(event.headers.cookie || '');
  const token = cookies.nikagenyx_session;

  if (!token) throw new Error('Missing token');

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new Error('Invalid token');
  }
};