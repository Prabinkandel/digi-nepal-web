const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  google_subject: { type: String, unique: true, sparse: true, index: true },
  role: { type: String, default: 'user' },
  is_active: { type: Number, default: 1 },
  auth_version: { type: Number, default: 0 },
  mfa_secret: { type: String, select: false },
  mfa_enabled: { type: Boolean, default: false },
  mfa_step: { type: Number, default: -1 },
  recovery_codes: { type: [String], select: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('User', userSchema);
