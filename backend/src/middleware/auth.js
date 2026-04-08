const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { error } = require('../utils/responses');

/**
 * JWT Authentication middleware.
 * Extracts Bearer token from Authorization header, verifies it,
 * and attaches the full user document to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 401, 'Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return error(res, 401, 'User not found. Token may be invalid.');
    }

    if (user.accountStatus !== 'Active') {
      return error(res, 403, `Account is ${user.accountStatus.toLowerCase()}.`);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 401, 'Token expired. Please refresh.');
    }
    if (err.name === 'JsonWebTokenError') {
      return error(res, 401, 'Invalid token.');
    }
    return error(res, 500, 'Authentication error.');
  }
};

/**
 * Role-based authorization middleware factory.
 * Usage: authorize('Driver', 'Admin') — allows only drivers and admins.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 401, 'Authentication required.');
    }
    if (!roles.includes(req.user.role)) {
      return error(res, 403, `Access denied. Required role: ${roles.join(' or ')}.`);
    }
    next();
  };
};

module.exports = { authenticate, authorize };
