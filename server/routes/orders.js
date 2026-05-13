const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { sendMail } = require('../utils/mailer');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

const WA_NUMBER = '9779840661406';

// User: place order
router.post('/', auth, async (req, res) => {
  try {
    const { product_id } = req.body;
    if (!product_id) return res.status(400).json({ error: 'product_id required' });
    
    const product = await Product.findOne({ id: product_id, is_active: 1 });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const orderId = uuidv4();
    const shortId = orderId.split('-')[0].toUpperCase();
    const productImg = product.image_url ? (product.image_url.startsWith('/') ? 'http://localhost:3001' + product.image_url : product.image_url) : 'No image available';
    const waMsg = `Hello ToolsVault! 👋\n\nI'd like to order:\n\n🛍️ *Product:* ${product.name}\n💰 *Price:* Rs ${product.price.toLocaleString()}\n🖼️ *Image:* ${productImg}\n🔖 *Order ID:* ${shortId}\n\n👤 *Name:* ${user.name}\n📧 *Email:* ${user.email}\n\nPlease confirm my order. Thank you!`;
    const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waMsg)}`;
    
    await Order.create({
      id: orderId,
      user_id: req.user.id,
      product_id: product_id,
      product_name: product.name,
      price: product.price,
      status: 'pending',
      wa_message: waMsg
    });
    
    sendMail({
      from: '"ToolsVault Orders" <no-reply@toolsvault.com>',
      to: user.email,
      subject: `Order Received: ${product.name}`,
      html: `<h2>Order Received!</h2>
             <p>Hi ${user.name}, we have received your order for <strong>${product.name}</strong>.</p>
             <p>Order ID: <b>${shortId}</b></p>
             <p>Price: Rs ${product.price.toLocaleString()}</p>
             <p>Please complete your order via WhatsApp. Thank you!</p>`
    }).catch(err => console.error('Failed to send order email:', err));

    res.json({ order_id: orderId, short_id: shortId, wa_url: waUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User: my orders
router.get('/my', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user_id: req.user.id }).sort({ created_at: -1 }).lean();
    // Populate product image
    for (let o of orders) {
      const p = await Product.findOne({ id: o.product_id });
      o.image_url = p ? p.image_url : null;
    }
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: all orders
router.get('/all', adminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const orders = await Order.find(filter).sort({ created_at: -1 }).lean();
    
    for (let o of orders) {
      const u = await User.findOne({ id: o.user_id });
      o.user_name = u ? u.name : 'Unknown';
      o.user_email = u ? u.email : 'Unknown';
    }
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: update order status
router.put('/:id/status', adminAuth, async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!['pending','verified','rejected','delivered'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    
    const updatedOrder = await Order.findOneAndUpdate(
      { id: req.params.id },
      { status, note: note || null },
      { new: true }
    ).lean();
    
    if (updatedOrder) {
      const user = await User.findOne({ id: updatedOrder.user_id });
      if (user && user.email && ['verified', 'delivered'].includes(status)) {
        sendMail({
          from: '"ToolsVault Orders" <no-reply@toolsvault.com>',
          to: user.email,
          subject: `Order ${status.toUpperCase()}: ${updatedOrder.product_name}`,
          html: `<h2>Order ${status.charAt(0).toUpperCase() + status.slice(1)}</h2>
                 <p>Hi ${user.name}, your order for <strong>${updatedOrder.product_name}</strong> has been marked as <b>${status}</b>.</p>
                 <p>Order ID: ${updatedOrder.id.split('-')[0].toUpperCase()}</p>
                 ${note ? `<p>Note from admin: ${note}</p>` : ''}
                 <p>Thank you for shopping with ToolsVault!</p>`
        }).catch(err => console.error('Failed to send status update email:', err));
      }
    }
    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
