/**
 * Clears all persisted admin dashboard activity log entries.
 * Usage: node server/scripts/clearAdminActivities.js
 */
require('dotenv').config();
const connectDB = require('../db/connect');
const { pingDatabase } = require('../db/connect');
const { clearAllAdminActivities } = require('../services/adminActivityService');

async function waitForDb() {
  connectDB();
  for (let i = 0; i < 12; i += 1) {
    if (await pingDatabase()) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Database not available.');
}

async function run() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
  }

  await waitForDb();
  const deleted = await clearAllAdminActivities();
  console.log(`Removed ${deleted} admin activity record(s).`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
