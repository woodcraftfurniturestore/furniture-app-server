const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "yourgmail@gmail.com",
    pass: process.env.EMAIL_PASS || "your_app_password",
  },
});

exports.sendRegistrationEmail = async (to, role) => {
  try {
    await transporter.sendMail({
      from: `"Furniture System" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Registration Successful 🎉",
      html: `
        <div style="font-family: Arial, padding: 10px;">
          <h2>Welcome!</h2>
          <p>Your <b>${role}</b> account has been registered successfully.</p>
          <p>You can now log in using your email and password.</p>
        </div>
      `,
    });
    console.log("✅ Email sent to:", to);
  } catch (error) {
    console.error("❌ Email sending error:", error.message);
  }
};
