const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const adminAuth = require('../middleware/adminAuth');

const uploadDir = path.join(__dirname, '../../uploads');
try {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
} catch (e) {
  console.warn('Could not create upload directory. This is expected on Vercel.');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files are allowed (jpg, png, webp, gif)'));
  }
});

router.post('/', adminAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Upload Error:', err);
      return res.status(500).json({ 
        error: 'Upload failed: ' + err.message,
        help: 'If you are on Vercel, please use the "Manual Image URL" field instead as the file system is read-only.'
      });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  });
});

module.exports = router;
