const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send AUI email verification link
 */
const sendVerificationEmail = async (email, token) => {
  // Points to the backend's own verification endpoint — not the frontend.
  // This ensures the link works even when the web app isn't running (dev/demo).
  // The backend renders an HTML confirmation page after processing the token.
  const verificationUrl = `${process.env.API_BASE_URL || 'http://localhost:5000'}/api/users/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"AUI Carpool" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Verify Your AUI Carpool Account',
    html: `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px;">
        <h2 style="color: #1B5E20;">Welcome to AUI Carpool!</h2>
        <p>Click the button below to verify your @aui.ma email address and activate your account.</p>
        <a href="${verificationUrl}" 
           style="display: inline-block; background: #1B5E20; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Verify My Email
        </a>
        <p style="color: #666; font-size: 13px;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      </div>
    `,
  });
};

/**
 * Send password reset link
 */
const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${process.env.CLIENT_WEB_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: `"AUI Carpool" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset Your AUI Carpool Password',
    html: `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px;">
        <h2 style="color: #1B5E20;">Password Reset Request</h2>
        <p>Click the button below to reset your password.</p>
        <a href="${resetUrl}" 
           style="display: inline-block; background: #1B5E20; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
};

module.exports = {
  transporter,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
