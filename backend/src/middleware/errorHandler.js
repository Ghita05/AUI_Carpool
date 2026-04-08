const { error } = require('../utils/responses');

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);

  // Mongoose validation error (e.g., missing required field, enum mismatch)
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return error(res, 400, 'Validation failed.', messages);
  }

  // Mongoose duplicate key (e.g., email already exists)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return error(res, 409, `Duplicate value for ${field}. Already exists.`);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return error(res, 400, `Invalid ID format: ${err.value}`);
  }

  // JWT errors (backup — primary handling is in auth middleware)
  if (err.name === 'JsonWebTokenError') {
    return error(res, 401, 'Invalid token.');
  }
  if (err.name === 'TokenExpiredError') {
    return error(res, 401, 'Token expired.');
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return error(res, 400, 'File too large. Maximum size is 5MB.');
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error.'
      : err.message || 'Internal server error.';

  return error(res, statusCode, message);
};

module.exports = errorHandler;
