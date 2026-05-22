/**
 * Optional: insert sample tasks when the clientTasks collection is empty.
 * Usage: node server/seedTasks.js
 * Requires MONGODB_URI and at least one client user in the database.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const ClientTask = require('./models/ClientTask');
const User = require('./models/User');

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/peer-match';
  await mongoose.connect(uri);
  if (mongoose.connection.readyState !== 1) {
    console.error('Database not connected.');
    process.exit(1);
  }

  const existing = await ClientTask.countDocuments();
  if (existing > 0) {
    console.log(`clientTasks collection already has ${existing} document(s). Skipping.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const client = await User.findOne({ role: 'user', accountType: 'client' }).sort({ createdAt: 1 });
  if (!client) {
    console.log('No client user found. Register a client first, then re-run.');
    await mongoose.disconnect();
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
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
