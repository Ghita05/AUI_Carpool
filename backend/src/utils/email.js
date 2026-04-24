const https = require('https');

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_NAME = 'AUI Carpool';
const FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || 'ghitanaf2005@gmail.com';

const sendBrevoEmail = ({ to, subject, html }) => {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });

    const req = https.request(
      {
        hostname: 'api.brevo.com',
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`Brevo error ${res.statusCode}: ${data}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

/**
 * Send AUI email verification link
 */
const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.API_BASE_URL || 'http://localhost:5000'}/api/users/verify-email?token=${token}`;

  await sendBrevoEmail({
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
  const resetUrl = `${process.env.API_BASE_URL || 'http://localhost:5000'}/api/users/reset-password-page?token=${token}`;

  await sendBrevoEmail({
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
  sendVerificationEmail,
  sendPasswordResetEmail,
};
