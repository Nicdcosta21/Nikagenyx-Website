// send_contact_email.js

const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { name, email, message } = JSON.parse(event.body);

  // Internal recipients
  const teamRecipients = [
    "n.dcosta@nikagenyx.com",
    "k.fernandes@nikagenyx.com",
    "consultant@nikagenyx.com"
  ];

  // Setup SMTP using Gmail with app password
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // consultant@nikagenyx.com
      pass: process.env.EMAIL_PASS  // Gmail App Password
    }
  });

  try {
    // 1. Send internal notification to Nikagenyx team
    await transporter.sendMail({
      from: `"Nikagenyx Website" <${process.env.EMAIL_USER}>`,
      to: teamRecipients.join(","),
      subject: `📩 New Contact Form Submission from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`
    });

    // 2. Send confirmation email to client
    await transporter.sendMail({
      from: `"Nikagenyx Vision Tech" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `✅ We received your message, ${name}`,
      text: `Hi ${name},\n\nThank you for contacting us. We’ve received your message and will get back to you shortly.\n\nRegards,\nNikagenyx Vision Tech`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Emails sent successfully." })
    };

  } catch (err) {
    console.error("Email error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: "Failed to send email." })
    };
  }
};
