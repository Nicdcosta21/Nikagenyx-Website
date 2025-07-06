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

  // Setup SMTP transport (Gmail)
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // consultant@nikagenyx.com
      pass: process.env.EMAIL_PASS  // Gmail App Password
    }
  });

  try {
    // 1. Send internal notification to team
    await transporter.sendMail({
      from: `"Nikagenyx Website" <${process.env.EMAIL_USER}>`,
      to: teamRecipients.join(","),
      subject: `New Contact Form Submission from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`
    });

    // 2. Send branded confirmation email to client
    await transporter.sendMail({
      from: `"Nikagenyx Vision Tech" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Thank you for contacting Nikagenyx, ${name}`,
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; background: #f9fafb; padding: 30px;">
          <div style="max-width: 600px; margin: auto; background: white; padding: 24px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
            <img src="https://nikagenyx.com/assets/Nikagenyx%20Vision%20Tech.png" alt="Nikagenyx Logo" style="height: 50px; margin-bottom: 20px;">
            <h2 style="color: #4F46E5;">Hi ${name},</h2>
            <p>Thank you for reaching out to <strong>Nikagenyx Vision Tech Private Limited</strong>.</p>
            <p>We’ve received your message and our team will respond shortly.</p>
            <div style="background: #f0f0ff; padding: 12px 16px; border-left: 4px solid #6366F1; margin: 20px 0;">
              <p style="margin: 0;"><strong>Your Message:</strong></p>
              <p style="margin: 5px 0 0;">${message}</p>
            </div>
            <p>If you have any urgent queries, feel free to reply to this email.</p>
            <p style="margin-top: 30px;">Warm regards,<br><strong>Team Nikagenyx</strong><br>
              <a href="https://nikagenyx.com" style="color: #4F46E5;">www.nikagenyx.com</a>
            </p>
          </div>
        </div>
      `
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
