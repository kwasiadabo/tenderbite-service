const { deleteImageFile } = require('./upload.middleware');

/**
 * Global error handler.
 * Must have exactly 4 parameters so Express recognises it as an error handler.
 *
 * Handles:
 *  - Multer errors (file size, unexpected field, invalid type)
 *  - Application errors (statusCode set by service layer)
 *  - Unexpected errors (500)
 *
 * If an image was optimised before the error was thrown, it is cleaned up
 * to avoid orphaned files on disk.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Clean up any uploaded file that didn't make it into the DB
  if (req.file?.optimisedPath) {
    deleteImageFile(req.file.optimisedPath);
  }

  console.error('[Error]', err.message, err.stack ? `\n${err.stack}` : '');

  // ── Multer-specific errors ─────────────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 5} MB.`,
    });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected field name. Use "productImage" as the field name for the image.',
    });
  }

  // ── Application / validation errors ───────────────────────────────────
  const statusCode = err.statusCode || 500;
  const message    = statusCode < 500 ? err.message : 'An unexpected error occurred';

  return res.status(statusCode).json({ success: false, message });
};

module.exports = errorHandler;