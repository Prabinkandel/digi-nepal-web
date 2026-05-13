const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  order_id: { type: String, default: null },
  user_id: { type: String, required: true },
  product_name: { type: String, required: true },
  amount: { type: Number, required: true },
  payer_name: { type: String, required: true },
  transaction_id: { type: String, required: true },
  payment_method: { type: String, required: true },
  phone: { type: String, default: '' },
  note: { type: String, default: '' },
  screenshot_url: { type: String, default: '' },
  status: { type: String, default: 'pending' },
  admin_note: { type: String, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Payment', paymentSchema);
