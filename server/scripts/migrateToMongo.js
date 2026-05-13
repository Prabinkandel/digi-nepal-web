require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const connectDB = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Offer = require('../models/Offer');
const Payment = require('../models/Payment');
const Otp = require('../models/Otp');

const migrateData = async () => {
  await connectDB();
  
  const dbFile = path.join(__dirname, '../db.json');
  if (!fs.existsSync(dbFile)) {
    console.log('No db.json file found. Nothing to migrate.');
    process.exit(0);
  }

  const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));

  console.log('--- Starting Migration ---');

  try {
    // Migrate Users
    if (data.users && data.users.length > 0) {
      await User.deleteMany({});
      await User.insertMany(data.users);
      console.log(`✅ Migrated ${data.users.length} Users`);
    }

    // Migrate Categories
    if (data.categories && data.categories.length > 0) {
      await Category.deleteMany({});
      await Category.insertMany(data.categories);
      console.log(`✅ Migrated ${data.categories.length} Categories`);
    }

    // Migrate Products
    if (data.products && data.products.length > 0) {
      await Product.deleteMany({});
      const products = data.products.map(p => ({
        ...p,
        features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features
      }));
      await Product.insertMany(products);
      console.log(`✅ Migrated ${products.length} Products`);
    }

    // Migrate Orders
    if (data.orders && data.orders.length > 0) {
      await Order.deleteMany({});
      await Order.insertMany(data.orders);
      console.log(`✅ Migrated ${data.orders.length} Orders`);
    }

    // Migrate Offers
    if (data.offers && data.offers.length > 0) {
      await Offer.deleteMany({});
      await Offer.insertMany(data.offers);
      console.log(`✅ Migrated ${data.offers.length} Offers`);
    }

    // Migrate Payments
    if (data.payments && data.payments.length > 0) {
      await Payment.deleteMany({});
      await Payment.insertMany(data.payments);
      console.log(`✅ Migrated ${data.payments.length} Payments`);
    }

    // Migrate Otps
    if (data.otps && data.otps.length > 0) {
      await Otp.deleteMany({});
      const otps = data.otps.map(o => ({
        ...o,
        expires_at: typeof o.expires_at === 'string' ? new Date(o.expires_at).getTime() : o.expires_at
      }));
      await Otp.insertMany(otps);
      console.log(`✅ Migrated ${data.otps.length} OTPs`);
    }

    console.log('🎉 Migration Completed Successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
};

migrateData();
