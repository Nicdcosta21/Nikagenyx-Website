const jwt = require('jsonwebtoken');

module.exports = (event) => {
  const m = (event.headers.cookie || '').match(/nikagenyx_session=([^;]+)/);
  if (!m)               throw new Error('missing');
  return jwt.verify(m[1], process.env.JWT_SECRET);   // throws if expired/tampered
};
