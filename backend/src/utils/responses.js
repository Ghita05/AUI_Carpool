const success = (res, statusCode, message, data = null) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  return res.status(statusCode).json(response);
};

const error = (res, statusCode, message, errors = null) => {
  const response = { success: false, message };
  if (errors !== null) response.errors = errors;
  return res.status(statusCode).json(response);
};

const paginated = (res, message, data, page, limit, total) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

module.exports = { success, error, paginated };