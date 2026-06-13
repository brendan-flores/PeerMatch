/**
 * Normalize hireStatus on tasks so community feed posts show correctly.
 * Usage: node server/scripts/repairTaskHireStatus.js
 */
require('dotenv').config();
const connectDB = require('../db/connect');
const { pingDatabase } = require('../db/connect');
const ClientTask = require('../models/ClientTask');

async function waitForDb() {
  connectDB();
  for (let i = 0; i < 12; i += 1) {
    if (await pingDatabase()) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Database not available.');
}

async function run() {
  await waitForDb();

  const tasks = await ClientTask.find({}).lean();
  let updated = 0;

  for (const task of tasks) {
    const patch = {};
    if (task.completedAt) {
      patch.hireStatus = 'completed';
    } else if (task.assignedFreelancerId) {
      patch.hireStatus = 'assigned';
    } else if (task.status === 'approved') {
      patch.hireStatus = 'open';
    } else {
      patch.hireStatus = 'open';
      patch.assignedFreelancerId = null;
    }

    const current = task.hireStatus || null;
    const needsUpdate =
      current !== patch.hireStatus ||
      (patch.hireStatus === 'open' && task.assignedFreelancerId);

    if (needsUpdate) {
      if (patch.hireStatus === 'open') {
        patch.assignedFreelancerId = null;
        patch.completedAt = null;
      }
      await ClientTask.updateOne({ _id: task._id }, { $set: patch });
      updated += 1;
      console.log(`Updated: ${task.title} → hireStatus=${patch.hireStatus}`);
    }
  }

  const feedCount = await ClientTask.countDocuments({
    status: 'approved',
    hireStatus: { $nin: ['assigned', 'completed'] },
  });

  console.log(`\nRepaired ${updated} task(s).`);
  console.log(`Community feed eligible (approved, open): ${feedCount}`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
