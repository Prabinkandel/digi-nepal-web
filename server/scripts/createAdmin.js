const { randomUUID } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { connectDatabase } = require('../config/db');
const User = require('../models/User');

async function main() {
  await connectDatabase();
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
