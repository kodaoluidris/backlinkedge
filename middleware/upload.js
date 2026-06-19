// Multer config for blog image uploads → public/uploads/
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    const id = crypto.randomBytes(8).toString('hex');
    cb(null, `blog-${id}${ext || '.jpg'}`);
  }
});

const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const ALLOWED = [...ALLOWED_IMAGE, ...ALLOWED_VIDEO];

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB (videos can be large)
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only image (JPG, PNG, WebP, GIF, AVIF) or video (MP4, WebM, OGG, MOV) files are allowed.'));
  }
});

const { isVideoUrl } = require('../lib/media');

// Detect media type from a mimetype or a file path/URL.
function mediaTypeOf({ mimetype, pathOrUrl } = {}) {
  if (mimetype) return mimetype.startsWith('video/') ? 'video' : 'image';
  if (pathOrUrl && isVideoUrl(pathOrUrl)) return 'video';
  return 'image';
}

module.exports = { upload, UPLOAD_DIR, mediaTypeOf };
