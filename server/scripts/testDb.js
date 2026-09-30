const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), quiet: true });
const mongoose = require('mongoose');
if (!process.env.MONGO_URI) throw new Error('Set MONGO_URI in .env before running this database connection check.');
mongoose.connect(process.env.MONGO_URI)
  .then(() => { console.log('Database connection succeeded.'); return mongoose.disconnect(); })
  .catch(error => { console.error('Database connection failed:', error.message); process.exitCode = 1; });
