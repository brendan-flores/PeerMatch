/**
 * Clears all persisted admin dashboard activity log entries.
 * Usage: node server/clearAdminActivities.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { clearAllAdminActivities } = require('./services/adminActivityService');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const deleted = await clearAllAdminActivities();
  console.log(`Removed ${deleted} admin activity record(s).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
