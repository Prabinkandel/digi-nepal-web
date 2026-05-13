const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  user_id: { type: String, required: true },
  product_id: { type: String, required: true },
  product_name: { type: String, required: true },
  price: { type: Number, required: true },
  status: { type: String, default: 'pending' },
  wa_message: { type: String, default: '' },
  note: { type: String, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Order', orderSchema);
