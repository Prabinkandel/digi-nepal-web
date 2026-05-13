const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const adminAuth = require('../middleware/adminAuth');
const Product = require('../models/Product');
const Category = require('../models/Category');

// Helper to populate category details manually (since we use string ids instead of ObjectIds)
const populateCategory = async (products) => {
  const cats = await Category.find();
  const catMap = {};
  cats.forEach(c => catMap[c.id] = c);
  
  if (Array.isArray(products)) {
    return products.map(p => {
      const c = catMap[p.category_id];
      return { ...p.toObject(), category_name: c?.name, category_icon: c?.icon, category_color: c?.color };
    });
  } else {
    const c = catMap[products.category_id];
    return { ...products.toObject(), category_name: c?.name, category_icon: c?.icon, category_color: c?.color };
  }
};

// GET all active products (public)
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { is_active: 1 };
    if (category) filter.category_id = category;
    if (search) filter.name = { $regex: search, $options: 'i' };
    
    const products = await Product.find(filter).sort({ sort_order: 1, created_at: -1 });
    const populated = await populateCategory(products);
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  try {
    const p = await Product.findOne({ id: req.params.id });
    if (!p) return res.status(404).json({ error: 'Product not found' });
    res.json(await populateCategory(p));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE product (admin)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, category_id, price, original_price, discount, badge, description, features, rating, sort_order, image_url } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price required' });
    
    const id = uuidv4();
    const product = await Product.create({
      id, name, category_id, price, 
      original_price: original_price || null, 
      discount: discount || 0, 
      badge: badge || null, 
      image_url: image_url || null,
      description: description || '', 
      features: features || [], 
      rating: rating || 4.8, 
      sort_order: sort_order || 0
    });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE product (admin)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { name, category_id, price, original_price, discount, badge, image_url, description, features, rating, is_active, sort_order } = req.body;
    
    const product = await Product.findOneAndUpdate(
      { id: req.params.id },
      { 
        name, category_id, price, 
        original_price: original_price || null, 
        discount: discount || 0, 
        badge: badge || null, 
        image_url: image_url || null,
        description: description || '', 
        features: features || [], 
        rating: rating || 4.8, 
        is_active: is_active !== undefined ? is_active : 1, 
        sort_order: sort_order || 0 
      },
      { new: true }
    );
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE product (soft delete, admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await Product.findOneAndUpdate({ id: req.params.id }, { is_active: 0 });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
