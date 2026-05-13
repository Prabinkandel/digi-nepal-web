const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  icon: { type: String, default: '📦' },
  color: { type: String, default: 'linear-gradient(135deg,#667eea,#764ba2)' },
  sort_order: { type: Number, default: 0 },
  is_active: { type: Number, default: 1 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Category', categorySchema);
