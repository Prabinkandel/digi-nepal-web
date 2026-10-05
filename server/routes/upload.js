const router = require('express').Router();
const multer = require('multer');
let sharp;
try { sharp = require('sharp'); } catch (e) { void e; }
const { randomUUID } = require('node:crypto');
const auth = require('../middleware/auth'), access = require('../middleware/access'), limit = require('../middleware/limits');
const Media = require('../models/Media');
const { fail } = require('../utils/validation');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 1 } });

router.post('/', auth, limit('uploads', 60, 3600, req => req.user.id), upload.single('image'), async (req, res) => {
  if (!req.file) fail(400, 'Please select an image file to upload.');
  const defaultPurpose = req.user && ['admin', 'editor'].includes(req.user.role) ? 'catalog' : 'receipt';
  const purpose = req.body.purpose || defaultPurpose;
  if (!['catalog', 'receipt'].includes(purpose)) fail(400, 'Invalid upload purpose.');

  if (purpose === 'catalog') {
    const guards = access('admin', 'editor');
    await new Promise((resolve, reject) => guards[1](req, res, e => e ? reject(e) : resolve()));
    if (res.headersSent) return;
  }

  const file = req.file;
  let output = file.buffer;
  let mime = file.mimetype || 'image/jpeg';

  if (sharp) {
    try {
      const pipeline = sharp(file.buffer, { limitInputPixels: 50000000, failOn: 'none' });
      output = await pipeline.rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 90 }).toBuffer();
      mime = 'image/webp';
    } catch (err) {
      console.warn('[UPLOAD SHARP FALLBACK]', err.message);
    }
  }

  const media = await Media.create({
    id: randomUUID(),
    owner_id: req.user.id,
    purpose,
    name: String(file.originalname).replace(/[^a-zA-Z0-9 ._-]/g, '').slice(0, 100) || 'Image',
    data: output,
    mime,
    size: output.length
  });

  res.status(201).json({ id: media.id, url: '/api/media/' + media.id, name: media.name });
});

module.exports = router;
