const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  category_id: { type: String, required: true },
  price: { type: Number, required: true },
  original_price: { type: Number, default: null },
  discount: { type: Number, default: 0 },
  badge: { type: String, default: null },
  image_url: { type: String, default: null },
  description: { type: String, default: '' },
  features: { type: [String], default: [] },
  rating: { type: Number, default: 4.8 },
  is_active: { type: Number, default: 1 },
  sort_order: { type: Number, default: 0 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Product', productSchema);
