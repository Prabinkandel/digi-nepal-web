const router = require('express').Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const adminAuth = require('../middleware/adminAuth');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Use memory storage for Vercel & Base64 compatibility
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post('/', adminAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // 1. Try Cloudinary if configured
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      try {
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        let dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;
        
        const result = await cloudinary.uploader.upload(dataURI, {
          resource_type: 'auto',
          folder: 'digi-nepal'
        });
        
        return res.json({ 
          url: result.secure_url, 
          filename: result.public_id,
          provider: 'cloudinary'
        });
      } catch (cloudErr) {
        console.error('Cloudinary upload failed, falling back to Base64:', cloudErr);
      }
    }

    // 2. Fallback: Base64 Data URI (Works everywhere, including Vercel, without extra setup)
    // This stores the image directly in the MongoDB string.
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${b64}`;
    
    // Check if the image is too large for MongoDB (16MB BSON limit, but we recommend smaller)
    if (dataUrl.length > 2 * 1024 * 1024) { // 2MB limit for Base64 to keep DB fast
      return res.status(400).json({ error: 'Image too large for local storage. Please use a smaller image or configure Cloudinary.' });
    }

    return res.json({ 
      url: dataUrl, 
      filename: `local-${Date.now()}`,
      provider: 'base64'
    });

  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

module.exports = router;
