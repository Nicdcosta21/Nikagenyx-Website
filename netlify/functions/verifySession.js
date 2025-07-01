const jwt = require('jsonwebtoken');
const cookie = require('cookie');

module.exports = function verify(event) {
  const cookies = cookie.parse(event.headers.cookie || '');
  const token = cookies.nikagenyx_session;

  if (!token) throw new Error('No token');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded; // useful if you want to access empId later
  } catch (err) {
    throw new Error('Invalid token');
  }
};
