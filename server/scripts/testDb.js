const dns = require('node:dns');
if (!process.env.VERCEL) {
  try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) { void e; }
}

const path = require('node:path');
require('dotenv').config({ path: [path.join(__dirname, '../../.env'), path.join(__dirname, '../.env')], quiet: true });
const connectDB = require('../config/db');

connectDB()
  .then(() => {
    console.log('✅ Database connection succeeded.');
    return connectDB.close();
  })
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  });
