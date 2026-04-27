const jwt = require('jsonwebtoken');

// Short-lived access token attached to every API request.
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

// Long-lived refresh token used to obtain new access tokens.
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

// Email verification token — expires in 24h.
const generateVerificationToken = (userId, email) => {
  return jwt.sign(
    { userId, email, purpose: 'email-verification' },
    process.env.JWT_VERIFICATION_SECRET,
    { expiresIn: process.env.JWT_VERIFICATION_EXPIRY || '24h' }
  );
};

// Password reset token — expires in 1h.
const generateResetToken = (userId, email) => {
  return jwt.sign(
    { userId, email, purpose: 'password-reset' },
    process.env.JWT_RESET_SECRET,
    { expiresIn: process.env.JWT_RESET_EXPIRY || '1h' }
  );
};

// Verifies any JWT given its secret.
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
