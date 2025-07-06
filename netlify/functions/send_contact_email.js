const nodemailer = require("nodemailer");
const fetch = require("node-fetch"); 
const { v4: uuidv4 } = require("uuid");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { name, email, message, token } = JSON.parse(event.body);
  const RECAPTCHA_SECRET = "6Lev5nkrAAAAAKenvXZzIuidjO-MVk7Yjf74a1vM";

  // Verify reCAPTCHA
  const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${RECAPTCHA_SECRET}&response=${token}`
  });

  const verifyData = await verifyRes.json();
  if (!verifyData.success) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: "reCAPTCHA validation failed." })
    };
  }

  const ticketId = `NGX-${uuidv4().split("-")[0].toUpperCase()}`;

  const teamRecipients = [
    "n.dcosta@nikagenyx.com",
    "k.fernandes@nikagenyx.com",
    "consultant@nikagenyx.com"
  ];

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    // Send internal team email
    await transporter.sendMail({
      from: `"Nikagenyx Website" <${process.env.EMAIL_USER}>`,
      to: teamRecipients.join(","),
      subject: `[${ticketId}] New Contact Form Submission from ${name}`,
      text: `Ticket ID: ${ticketId}\nName: ${name}\nEmail: ${email}\nMessage:\n${message}`
    });

    // Send confirmation email to client
    await transporter.sendMail({
      from: `"Nikagenyx Vision Tech" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Thank you for contacting Nikagenyx (Ticket ${ticketId})`,
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; background: #f9fafb; padding: 30px;">
          <div style="max-width: 600px; margin: auto; background: white; padding: 24px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
            <img src="https://nikagenyx.com/assets/Nikagenyx%20Vision%20Tech.png" alt="Nikagenyx Logo" style="height: 50px; margin-bottom: 20px;">
            <h2 style="color: #4F46E5;">Hi ${name},</h2>
            <p>Thank you for reaching out to <strong>Nikagenyx Vision Tech Private Limited</strong>.</p>
            <p>Your message has been received. Your ticket reference ID is <strong>${ticketId}</strong>.</p>
            <div style="background: #f0f0ff; padding: 12px 16px; border-left: 4px solid #6366F1; margin: 20px 0;">
              <p style="margin: 0;"><strong>Your Message:</strong></p>
              <p style="margin: 5px 0 0;">${message}</p>
            </div>
            <p>If you have any urgent concerns, you may reply directly to this email with your ticket ID.</p>
            <p style="margin-top: 30px;">Warm regards,<br><strong>Team Nikagenyx</strong><br>
              <a href="https://nikagenyx.com" style="color: #4F46E5;">www.nikagenyx.com</a>
            </p>
          </div>
        </div>
      `
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Emails sent successfully.", ticket_id: ticketId })
    };

  } catch (err) {
    console.error("Email error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: "Failed to send email." })
    };
  }
};
