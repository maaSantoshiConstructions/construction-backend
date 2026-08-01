/**
 * Standardized API Response Helpers
 */

/**
 * Sends a standard success response
 * @param {object} res - Express response object
 * @param {*} data - Payload data
 * @param {string} [message] - Optional success message
 * @param {number} [statusCode=200] - HTTP status code
 */
export const sendSuccess = (res, data, message, statusCode = 200) => {
  const payload = { success: true };
  if (message) payload.message = message;
  if (data !== undefined) payload.data = data;
  return res.status(statusCode).json(payload);
};

/**
 * Sends a standardized paginated response
 * @param {object} res - Express response object
 * @param {Array} data - Array of items for current page
 * @param {number} total - Total document count
 * @param {number|string} page - Current page number
 * @param {number|string} limit - Items per page
 * @param {number} [statusCode=200] - HTTP status code
 */
export const sendPaginated = (res, data, total, page = 1, limit = 10, statusCode = 200) => {
  const parsedLimit = Number(limit) || 10;
  const parsedPage = Number(page) || 1;
  const totalPages = Math.ceil(total / parsedLimit) || 1;

  return res.status(statusCode).json({
    success: true,
    count: data.length,
    total,
    page: parsedPage,
    totalPages,
    data,
  });
};
