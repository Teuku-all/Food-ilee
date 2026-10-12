module.exports = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  const statusCode =
    error.statusCode ||
    error.status ||
    (error.type === 'entity.parse.failed' ? 400 : error.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  const safeStatus =
    Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600 ? statusCode : 500;

  if (safeStatus >= 500) console.error(error);

  res.status(safeStatus).json({
    success: false,
    message:
      safeStatus >= 500 && process.env.NODE_ENV === 'production'
        ? 'Terjadi kesalahan pada server. Silakan coba lagi.'
        : error.message || 'Permintaan belum dapat diproses.',
  });
};
