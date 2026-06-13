/**
 * One-off / ops: promote a user to admin by email.
 * Usage: node server/scripts/promoteToAdmin.js user@example.com
 */
require('dotenv').config();
const connectDB = require('../db/connect');
const { pingDatabase } = require('../db/connect');
const User = require('../models/User');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function waitForDb() {
  connectDB();
  for (let i = 0; i < 12; i += 1) {
    if (await pingDatabase()) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Database not available.');
}

async function run() {
  const emailArg = process.argv[2];
  if (!emailArg) {
    console.error('Usage: node server/scripts/promoteToAdmin.js <email>');
    process.exit(1);
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
  }

  const email = normalizeEmail(emailArg);
  await waitForDb();

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  user.role = 'admin';
  user.verified = true;
  await user.save();

  console.log(`Updated ${email}: role=admin, verified=true`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
