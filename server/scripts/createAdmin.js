const dns = require('node:dns');
if (!process.env.VERCEL) {
  try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) { void e; }
}

const path = require('node:path');
require('dotenv').config({ path: [path.join(__dirname, '../../.env'), path.join(__dirname, '../.env')], quiet: true });
const { randomUUID } = require('node:crypto');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

async function main() {
  await connectDB();
  const email = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@diginepal.com';
  const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'admin123';
  const name = process.argv[4] || 'Admin';

  const hash = await bcrypt.hash(password, 12);
  const existing = await User.findOne({ email });

  if (existing) {
    existing.password = hash;
    existing.role = 'admin';
    existing.is_active = 1;
    await existing.save();
    console.log(`✅ Admin account updated: ${email}`);
  } else {
    await User.create({
      id: randomUUID(),
      name,
      email,
      password: hash,
      role: 'admin',
      is_active: 1,
      auth_version: 0,
      mfa_enabled: false
    });
    console.log(`✅ Admin account created: ${email}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Failed to create/update admin:', err.message);
  process.exit(1);
});
