/**
 * Inspect tasks and what the public feed query returns.
 * Usage: node server/scripts/inspectTasks.js
 */
require('dotenv').config();
const connectDB = require('../db/connect');
const { pingDatabase } = require('../db/connect');
const ClientTask = require('../models/ClientTask');
const User = require('../models/User');
const { mapTaskToFeedPost } = require('../utils/taskFeedDto');

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

  const all = await ClientTask.find({}).select('title status hireStatus clientId assignedFreelancerId').lean();
  console.log('TOTAL tasks:', all.length);

  const byStatus = {};
  const byHire = {};
  for (const t of all) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    const hs = t.hireStatus == null ? '(null/missing)' : t.hireStatus;
    byHire[hs] = (byHire[hs] || 0) + 1;
  }
  console.log('By moderation status:', byStatus);
  console.log('By hireStatus:', byHire);

  const withAssign = all.filter((t) => t.assignedFreelancerId);
  console.log('With assignedFreelancerId:', withAssign.length);

  const feedTasks = await ClientTask.find({
    status: 'approved',
    hireStatus: { $nin: ['assigned', 'completed'] },
  })
    .populate('clientId', 'name email accountType photoDataUrl')
    .lean();
  console.log('Feed query count:', feedTasks.length);

  let mapErrors = 0;
  for (const task of feedTasks) {
    try {
      const dto = mapTaskToFeedPost(task);
      if (!dto.id || !dto.authorId) {
        console.log('WARN sparse dto:', task.title, dto);
      }
    } catch (e) {
      mapErrors += 1;
      console.log('MAP ERROR:', task.title, e.message);
    }
  }
  console.log('Map errors:', mapErrors);

  const orphanClients = [];
  for (const t of all) {
    const exists = await User.exists({ _id: t.clientId });
    if (!exists) orphanClients.push(t.title);
  }
  if (orphanClients.length) {
    console.log('Tasks with missing client user:', orphanClients.join(', '));
  }

  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
