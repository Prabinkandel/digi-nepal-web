const router = require('express').Router();
const Setting = require('../models/Setting');
const adminAuth = require('../middleware/adminAuth');

// Public: Get all settings
router.get('/', async (req, res) => {
  try {
    const settings = await Setting.find();
    const config = {};
    settings.forEach(s => config[s.key] = s.value);
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Update a setting
router.post('/', adminAuth, async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) return res.status(400).json({ error: 'Key and value required' });

    const setting = await Setting.findOneAndUpdate(
      { key },
      { value },
      { upsert: true, new: true }
    );
    res.json(setting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
