/**
 * Idempotent admin bootstrap. Credentials come only from environment — never hardcode secrets.
 *
 * Usage: node server/scripts/seedAdmin.js
 * Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_ADMIN_PASSWORD (min 8 chars)
 * Optional: SEED_ADMIN_EMAIL (default admin@peermatch.com), SEED_ADMIN_NAME, SEED_ADMIN_USERNAME
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../db/connect');
const { pingDatabase } = require('../db/connect');
const User = require('../models/User');

const DEFAULT_ADMIN_EMAIL = 'admin@peermatch.com';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function migrateLegacyRegistrationRoles() {
  await User.updateMany({ role: 'client' }, { $set: { role: 'user', accountType: 'client' } });
  await User.updateMany({ role: 'freelancer' }, { $set: { role: 'user', accountType: 'freelancer' } });
}

async function waitForDb() {
  connectDB();
  for (let i = 0; i < 12; i += 1) {
    if (await pingDatabase()) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Database not available. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

async function run() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
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

  await waitForDb();
  console.log('Supabase connected for seed.');

  await migrateLegacyRegistrationRoles();

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin seed skipped: an account already exists for ${email}.`);
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
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
