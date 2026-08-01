/**
 * Async Handler Middleware
 * Wraps async controller routes to automatically pass unhandled errors to Express error middleware.
 * Eliminates repetitive try/catch boilerplate across controllers.
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
