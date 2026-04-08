const jwt = require('jsonwebtoken');

/**
 * Generate an access token (short-lived, attached to every API request)
 */
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

/**
 * Generate a refresh token (long-lived, used to obtain new access tokens)
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

/**
 * Generate an email verification token (sent via Nodemailer)
 */
const generateVerificationToken = (userId, email) => {
  return jwt.sign(
    { userId, email, purpose: 'email-verification' },
    process.env.JWT_VERIFICATION_SECRET,
    { expiresIn: process.env.JWT_VERIFICATION_EXPIRY || '24h' }
  );
};

/**
 * Generate a password reset token (sent via Nodemailer)
 */
const generateResetToken = (userId, email) => {
  return jwt.sign(
    { userId, email, purpose: 'password-reset' },
    process.env.JWT_RESET_SECRET,
    { expiresIn: process.env.JWT_RESET_EXPIRY || '1h' }
  );
};

/**
 * Verify any token given its secret
 */
const verifyToken = (token, secret) => {
  return jwt.verify(token, secret);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateVerificationToken,
  generateResetToken,
  verifyToken,
};
