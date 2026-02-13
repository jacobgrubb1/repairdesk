function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    console.error(err.stack);
  } else {
    console.error(`[ERROR] ${err.message}`);
  }

  res.status(status).json({
    error: status === 500 && isProduction
      ? 'Internal server error'
      : err.message || 'Internal server error',
  });
}

module.exports = errorHandler;
