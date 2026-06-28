// ----------------------------------------------------------------------
// File upload middleware (Task 12)
// multer storage for medical-record attachments, capped at 10 MB per file
// (SR5.11). Files are stored under public/uploads and served statically.
// ----------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB (SR5.11)
});

module.exports = { upload, UPLOAD_DIR };
