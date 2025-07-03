// netlify/functions/verifySession.js

const jwt = require("jsonwebtoken");

function extractTokenFromCookie(cookieHeader) {
  const match = cookieHeader?.match(/nikagenyx_session=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Verifies the JWT token from cookies and returns user payload.
 * @param {object} event - Netlify event (includes headers with cookies)
 * @returns {object|null} decoded token or null
 */
function verifySession(event) {
  try {
    const cookie = event.headers.cookie || "";
    const token = extractTokenFromCookie(cookie);
    if (!token) throw new Error("Missing token");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded; // { empId, role, ... }
  } catch (err) {
    console.error("❌ verifySession failed:", err.message);
    return null;
  }
}

// Optional test endpoint if called directly
exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  const user = verifySession(event);
  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: "Unauthorized: Invalid or missing token" }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Session valid", user }),
  };
};

module.exports = verifySession;
