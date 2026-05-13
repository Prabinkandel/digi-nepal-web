require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const Setting = require('./server/models/Setting');

async function seedSettings() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    await Setting.findOneAndUpdate(
      { key: 'payment_qr_url' },
      { value: '/uploads/fonepay_qr.png' },
      { upsert: true }
    );

    console.log('✅ Payment QR setting initialized with FonePay QR.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedSettings();
