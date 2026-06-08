/**
 * One-off / ops: promote a user to admin by email.
 * Usage: node server/scripts/promoteToAdmin.js user@example.com
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function run() {
  const emailArg = process.argv[2];
  if (!emailArg) {
    console.error('Usage: node server/scripts/promoteToAdmin.js <email>');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required.');
    process.exit(1);
  }

  const email = normalizeEmail(emailArg);
  await mongoose.connect(uri);

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  user.role = 'admin';
  user.verified = true;
  await user.save();

  console.log(`Updated ${email}: role=admin, verified=true`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
