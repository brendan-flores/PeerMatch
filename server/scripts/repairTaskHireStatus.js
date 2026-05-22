/**
 * Normalize hireStatus on tasks so community feed posts show correctly.
 * - approved + no assignment → hireStatus 'open'
 * - has assignedFreelancerId → hireStatus 'assigned' (or 'completed' if completedAt)
 *
 * Usage: node server/scripts/repairTaskHireStatus.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
require('dotenv').config();
const mongoose = require('mongoose');
const Task = require('../models/Task');

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/peer-match';
  await mongoose.connect(uri);

  const tasks = await Task.find({}).lean();
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
      await Task.updateOne({ _id: task._id }, { $set: patch });
      updated += 1;
      console.log(`Updated: ${task.title} → hireStatus=${patch.hireStatus}`);
    }
  }

  const feedCount = await Task.countDocuments({
    status: 'approved',
    hireStatus: { $nin: ['assigned', 'completed'] },
  });

  console.log(`\nRepaired ${updated} task(s).`);
  console.log(`Community feed eligible (approved, open): ${feedCount}`);

  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
