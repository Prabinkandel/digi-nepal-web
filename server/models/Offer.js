const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  product_id: { type: String, required: true },
  label: { type: String, required: true },
  discount_pct: { type: Number, required: true },
  valid_until: { type: String, default: null },
  is_active: { type: Number, default: 1 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Offer', offerSchema);
