const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  try {
    const { name, email, message } = JSON.parse(event.body || "{}");

    if (!name || !email || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "All fields are required." }),
      };
    }

    // Configure transporter for consultant@nikagenyx.com
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.com", // Change if you're using Gmail or another provider
      port: 465,
      secure: true,
      auth: {
        user: "consultant@nikagenyx.com",
        pass: process.env.EMAIL_PASS, // Set this in Netlify environment variables
      },
    });

    // Email to admin team
    const adminMailOptions = {
      from: '"Nikagenyx Website" <consultant@nikagenyx.com>',
      to: "k.fernandes@nikagenyx.com, n.dcosta@nikagenyx.com, consultant@nikagenyx.com",
      subject: `📩 New Contact Form Submission from ${name}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      `,
    };

    // Confirmation email to user
    const clientMailOptions = {
      from: '"Nikagenyx Vision Tech" <consultant@nikagenyx.com>',
      to: email,
      subject: "✅ We've received your message!",
      html: `
        <p>Hi ${name},</p>
        <p>Thank you for contacting us. Your message has been received by our team.</p>
        <p>One of our consultants will get back to you shortly.</p>
        <br/>
        <p>Warm regards,<br/>Team Nikagenyx</p>
      `,
    };

    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(clientMailOptions);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Message sent successfully." }),
    };

  } catch (error) {
    console.error("Email error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to send message.", error: error.message }),
    };
  }
};
const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  try {
    const { name, email, message } = JSON.parse(event.body || "{}");

    if (!name || !email || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "All fields are required." }),
      };
    }

    // Configure transporter for consultant@nikagenyx.com
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.com", // Change if you're using Gmail or another provider
      port: 465,
      secure: true,
      auth: {
        user: "consultant@nikagenyx.com",
        pass: process.env.EMAIL_PASS, // Set this in Netlify environment variables
      },
    });

    // Email to admin team
    const adminMailOptions = {
      from: '"Nikagenyx Website" <consultant@nikagenyx.com>',
      to: "k.fernandes@nikagenyx.com, n.dcosta@nikagenyx.com, consultant@nikagenyx.com",
      subject: `📩 New Contact Form Submission from ${name}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      `,
    };

    // Confirmation email to user
    const clientMailOptions = {
      from: '"Nikagenyx Vision Tech" <consultant@nikagenyx.com>',
      to: email,
      subject: "✅ We've received your message!",
      html: `
        <p>Hi ${name},</p>
        <p>Thank you for contacting us. Your message has been received by our team.</p>
        <p>One of our consultants will get back to you shortly.</p>
        <br/>
        <p>Warm regards,<br/>Team Nikagenyx</p>
      `,
    };

    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(clientMailOptions);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Message sent successfully." }),
    };

  } catch (error) {
    console.error("Email error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to send message.", error: error.message }),
    };
  }
};
