const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const adminAuth = require('../middleware/adminAuth');
const Category = require('../models/Category');

router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ is_active: 1 }).sort({ sort_order: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, icon, color, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const id = uuidv4();
    const category = await Category.create({ 
      id, name, 
      icon: icon || '📦', 
      color: color || 'linear-gradient(135deg,#667eea,#764ba2)', 
      sort_order: sort_order || 0 
    });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { name, icon, color, sort_order, is_active } = req.body;
    const category = await Category.findOneAndUpdate(
      { id: req.params.id },
      { 
        name, 
        icon: icon || '📦', 
        color, 
        sort_order: sort_order || 0, 
        is_active: is_active !== undefined ? is_active : 1 
      },
      { new: true }
    );
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await Category.findOneAndUpdate({ id: req.params.id }, { is_active: 0 });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
