const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { firstName, lastName } = JSON.parse(event.body);
    const fullName = `${firstName} ${lastName}`;

    const emp_id = `NGX${Date.now().toString().slice(-6)}`;
    const secret = speakeasy.generateSecret({ name: `Nikagenyx (${fullName})` });
    const qr_code_url = await QRCode.toDataURL(secret.otpauth_url);

    return {
      statusCode: 200,
      body: JSON.stringify({
        emp_id,
        qr_code_url,
        mfa_secret: secret.base32
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate MFA", detail: err.message })
    };
  }
};
