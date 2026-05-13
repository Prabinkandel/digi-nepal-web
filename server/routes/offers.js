const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const adminAuth = require('../middleware/adminAuth');
const Offer = require('../models/Offer');
const Product = require('../models/Product');

// Helper to populate product name
const populateProduct = async (offers) => {
  if (Array.isArray(offers)) {
    const populated = [];
    for (let o of offers) {
      const p = await Product.findOne({ id: o.product_id });
      populated.push({ ...o, product_name: p ? p.name : 'Unknown Product' });
    }
    return populated;
  } else {
    const p = await Product.findOne({ id: offers.product_id });
    return { ...offers, product_name: p ? p.name : 'Unknown Product' };
  }
};

router.get('/', async (req, res) => {
  try {
    const offers = await Offer.find({ is_active: 1 }).sort({ created_at: -1 }).lean();
    res.json(await populateProduct(offers));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/all', adminAuth, async (req, res) => {
  try {
    const offers = await Offer.find().sort({ created_at: -1 }).lean();
    res.json(await populateProduct(offers));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', adminAuth, async (req, res) => {
  try {
    const { product_id, label, discount_pct, valid_until } = req.body;
    if (!product_id || !label) return res.status(400).json({ error: 'product_id and label required' });
    
    const id = uuidv4();
    const offer = await Offer.create({
      id, product_id, label, 
      discount_pct: discount_pct || 0, 
      valid_until: valid_until || null
    });

    // Auto-update product discount
    if (discount_pct) {
      const p = await Product.findOne({ id: product_id });
      if (p) {
        const orig = p.original_price || p.price;
        const newPrice = Math.round(orig * (1 - discount_pct / 100));
        await Product.findOneAndUpdate(
          { id: product_id }, 
          { discount: discount_pct, original_price: orig, price: newPrice, badge: 'sale' }
        );
      }
    }
    res.json(offer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { label, discount_pct, valid_until, is_active } = req.body;
    const offer = await Offer.findOneAndUpdate(
      { id: req.params.id },
      { 
        label, 
        discount_pct: discount_pct || 0, 
        valid_until: valid_until || null, 
        is_active: is_active !== undefined ? is_active : 1 
      },
      { new: true }
    );
    res.json(offer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await Offer.findOneAndUpdate({ id: req.params.id }, { is_active: 0 });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
