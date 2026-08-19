// Centralized error formatter. Every route either throws/passes an
// AppError (expected, user-facing) or lets an unexpected error bubble up
// (logged, returned as a generic 500) — the frontend's apiClient.js reads
// `message` off every non-2xx response body, so always include one.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  const message = typeof err?.message === 'string' && err.message.trim()
    ? err.message
    : 'Something went wrong on the server.';

  if (!err || !err.isAppError) {
    console.error(err);
  }

  res.status(statusCode).json({ message });
}

function notFoundHandler(req, res) {
  res.status(404).json({ message: `No route matches ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };
