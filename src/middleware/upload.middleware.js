const multer  = require('multer');
const sharp   = require('sharp');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR    = path.resolve(process.env.UPLOAD_DIR || 'uploads');
const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Multer: store in memory so Sharp can process before disk write ──────
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`),
      false,
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// ── Sharp optimisation middleware ────────────────────────────────────────
/**
 * Converts the uploaded buffer to WebP (quality 80) and writes it to disk.
 * WebP gives ~30–50 % smaller files vs JPEG/PNG at similar visual quality,
 * reducing both storage and transfer time on every image retrieval.
 *
 * Attaches to req.file:
 *   optimisedPath  – absolute path on disk
 *   optimisedName  – filename stored in DB
 *   optimisedSize  – final byte size
 *   optimisedMime  – always 'image/webp'
 */
const optimiseImage = async (req, _res, next) => {
  if (!req.file) return next();

  try {
    const filename    = `${uuidv4()}.webp`;
    const outputPath  = path.join(UPLOAD_DIR, filename);

    const info = await sharp(req.file.buffer)
      .resize({ width: 1200, withoutEnlargement: true }) // cap width; preserve aspect
      .webp({ quality: 80 })
      .toFile(outputPath);

    req.file.optimisedPath = outputPath;
    req.file.optimisedName = filename;
    req.file.optimisedSize = info.size;
    req.file.optimisedMime = 'image/webp';

    next();
  } catch (err) {
    next(err);
  }
};

// ── Helper: delete image file from disk safely ───────────────────────────
const deleteImageFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // Non-fatal – log only
    console.warn('[Upload] Could not delete file:', filePath);
  }
};

module.exports = { upload, optimiseImage, deleteImageFile, UPLOAD_DIR };