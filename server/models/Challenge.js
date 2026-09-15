const mongoose = require('mongoose');
const schema = new mongoose.Schema({ email: { type: String, required: true }, purpose: { type: String, enum: ['register','reset'], required: true }, code_hash: String, password_hash: String, name: String, attempts: { type: Number, default: 0 }, expires_at: { type: Date, expires: 0 } });
schema.index({ email: 1, purpose: 1 }, { unique: true });
module.exports = mongoose.model('Challenge', schema);
