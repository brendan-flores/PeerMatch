/**
 * Optional: insert sample tasks when the clientTasks table is empty.
 * Usage: node server/scripts/seedTasks.js
 * Requires Supabase env and at least one client user in the database.
 */
require('dotenv').config();
const connectDB = require('../db/connect');
const { pingDatabase } = require('../db/connect');
const ClientTask = require('../models/ClientTask');
const User = require('../models/User');

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

  const existing = await ClientTask.countDocuments();
  if (existing > 0) {
    console.log(`clientTasks already has ${existing} row(s). Skipping.`);
    process.exit(0);
  }

  const client = await User.findOne({ role: 'user', accountType: 'client' }).sort({ createdAt: 1 });
  if (!client) {
    console.log('No client user found. Register a client first, then re-run.');
    process.exit(0);
  }

  await ClientTask.insertMany([
    {
      title: 'Research paper literature review',
      description: 'CS elective — need APA sources.',
      subjectCategory: 'Computer Science',
      urgency: 'high',
      clientId: client._id,
      budget: 2500,
      category: 'academic',
      status: 'pending',
      flagged: true,
    },
    {
      title: 'Event poster design',
      description: 'Campus org event poster.',
      subjectCategory: 'Design',
      urgency: 'normal',
      clientId: client._id,
      budget: 800,
      category: 'non-academic',
      status: 'pending',
      flagged: false,
    },
    {
      title: 'Data structures tutoring session',
      description: 'Weekly tutoring for midterms.',
      subjectCategory: 'Computer Science',
      urgency: 'low',
      clientId: client._id,
      budget: 1200,
      category: 'academic',
      status: 'approved',
      flagged: false,
    },
  ]);

  console.log('Inserted sample tasks for client:', client.email);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
