/**
 * Idempotent admin bootstrap. Credentials come only from environment — never hardcode secrets.
 *
 * Usage: node server/seedAdmin.js
 * Required: MONGODB_URI, SEED_ADMIN_PASSWORD (min 8 chars)
 * Optional: SEED_ADMIN_EMAIL (default admin@peermatch.com), SEED_ADMIN_NAME, SEED_ADMIN_USERNAME
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User');

const DEFAULT_ADMIN_EMAIL = 'admin@peermatch.com';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function migrateLegacyRegistrationRoles() {
  await User.updateMany({ role: 'client' }, { $set: { role: 'user', accountType: 'client' } });
  await User.updateMany({ role: 'freelancer' }, { $set: { role: 'user', accountType: 'freelancer' } });
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required.');
    process.exit(1);
  }

  const email = normalizeEmail(process.env.SEED_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL);
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = (process.env.SEED_ADMIN_NAME || 'PeerMatch Admin').trim();
  const username = (process.env.SEED_ADMIN_USERNAME || email.split('@')[0] || 'admin')
    .trim()
    .toLowerCase()
    .slice(0, 30);

  if (!password || password.length < 8) {
    console.error('SEED_ADMIN_PASSWORD must be set and at least 8 characters.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('MongoDB connected for seed.');

  await migrateLegacyRegistrationRoles();

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin seed skipped: an account already exists for ${email}.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  await User.create({
    username,
    name,
    email,
    password: hashedPassword,
    role: 'admin',
    verified: true,
  });

  console.log(`Admin user created: ${email}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
