const router = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');

// All users
router.get('/', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('id name email role is_active created_at').sort({ created_at: -1 }).lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle active
router.put('/:id/toggle', adminAuth, async (req, res) => {
  try {
    const u = await User.findOne({ id: req.params.id });
    if (!u) return res.status(404).json({ error: 'Not found' });
    if (u.role === 'admin') return res.status(403).json({ error: 'Cannot disable admin' });
    
    u.is_active = u.is_active ? 0 : 1;
    await u.save();
    res.json({ is_active: u.is_active });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Promote to admin
router.put('/:id/promote', adminAuth, async (req, res) => {
  try {
    await User.findOneAndUpdate({ id: req.params.id }, { role: 'admin' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats for dashboard
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const totalProducts = await Product.countDocuments({ is_active: 1 });
    
    const verifiedOrders = await Order.find({ status: 'verified' });
    const revenue = verifiedOrders.reduce((sum, order) => sum + order.price, 0);
    
    const recentOrders = await Order.find().sort({ created_at: -1 }).limit(5).lean();
    for (let o of recentOrders) {
      const u = await User.findOne({ id: o.user_id });
      o.user_name = u ? u.name : 'Unknown';
    }
    
    res.json({ totalUsers, totalOrders, pendingOrders, totalProducts, revenue, recentOrders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
