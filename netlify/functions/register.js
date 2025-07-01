// netlify/functions/register.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" })
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { firstName, lastName } = data;

    if (!firstName || !lastName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "First and last name required." })
      };
    }

    const fullName = `${firstName} ${lastName}`;
    const emp_id = `NGX${Date.now().toString().slice(-6)}`;

    // Generate MFA
    const secret = speakeasy.generateSecret({
      name: `Nikagenyx (${fullName})`,
    });
    const qr_code_url = await QRCode.toDataURL(secret.otpauth_url);

    return {
      statusCode: 200,
      body: JSON.stringify({
        emp_id,
        mfa_secret: secret.base32,
        qr_code_url
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to generate QR", error: err.message })
    };
  }
};
