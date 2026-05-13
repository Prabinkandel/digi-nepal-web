const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { sendMail } = require('../utils/mailer');
const Payment = require('../models/Payment');
const User = require('../models/User');

// User: submit a QR payment proof
router.post('/', auth, async (req, res) => {
  try {
    const { order_id, product_name, amount, payer_name, transaction_id, payment_method, phone, note, screenshot_url } = req.body;
    if (!payer_name || !transaction_id || !payment_method) {
      return res.status(400).json({ error: 'Payer name, transaction ID and payment method are required.' });
    }
    const id = uuidv4();
    await Payment.create({
      id, 
      order_id: order_id || null, 
      user_id: req.user.id, 
      product_name: product_name || '', 
      amount: amount || 0, 
      payer_name, 
      transaction_id, 
      payment_method, 
      phone: phone || '', 
      note: note || '', 
      screenshot_url: screenshot_url || ''
    });
    res.json({ payment_id: id, message: 'Payment submitted successfully! Admin will verify soon.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User: my payments
router.get('/my', auth, async (req, res) => {
  try {
    const payments = await Payment.find({ user_id: req.user.id }).sort({ created_at: -1 }).lean();
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: all payments
router.get('/all', adminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const payments = await Payment.find(filter).sort({ created_at: -1 }).lean();
    
    // Populate user info for admin
    for (let p of payments) {
      const u = await User.findOne({ id: p.user_id });
      p.user_name = u ? u.name : 'Unknown';
      p.user_email = u ? u.email : 'Unknown';
    }
    
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: verify / reject payment
router.put('/:id/status', adminAuth, async (req, res) => {
  try {
    const { status, admin_note } = req.body;
    if (!['pending', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const payment = await Payment.findOneAndUpdate(
      { id: req.params.id },
      { status, admin_note: admin_note || null },
      { new: true }
    ).lean();

    // Send email notification
    if (payment) {
      const user = await User.findOne({ id: payment.user_id });
      if (user && ['verified', 'rejected'].includes(status)) {
        const emoji = status === 'verified' ? '✅' : '❌';
        sendMail({
          from: '"ToolsVault Payments" <no-reply@toolsvault.com>',
          to: user.email,
          subject: `${emoji} Payment ${status.toUpperCase()}: ${payment.product_name}`,
          html: `<h2>${emoji} Payment ${status.charAt(0).toUpperCase() + status.slice(1)}</h2>
                 <p>Hi ${user.name},</p>
                 <p>Your payment of <strong>Rs ${Number(payment.amount).toLocaleString()}</strong> for <strong>${payment.product_name}</strong> has been <b>${status}</b>.</p>
                 <p>Transaction ID: <code>${payment.transaction_id}</code></p>
                 ${admin_note ? `<p>Note from admin: ${admin_note}</p>` : ''}
                 <p>${status === 'verified' ? 'Your order will be processed shortly. Thank you for shopping with ToolsVault!' : 'Please contact us on WhatsApp if you believe this is a mistake.'}</p>`
        }).catch(err => console.error('Payment email error:', err));
      }
    }

    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
