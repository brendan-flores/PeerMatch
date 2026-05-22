const mongoose = require('mongoose');

const MIGRATION_ID = 'purge_legacy_tasks_use_clientTasks_v1';

const migrationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    ranAt: { type: Date, default: Date.now },
  },
  { collection: 'migrations' },
);

/**
 * One-time: remove all posts from legacy `tasks` collection and related
 * offer/review rows, so client posts only live in `clientTasks` going forward.
 */
async function migrateLegacyTasksToClientTasks() {
  const Migration =
    mongoose.models.Migration || mongoose.model('Migration', migrationSchema);

  const existing = await Migration.findOne({ id: MIGRATION_ID }).lean();
  if (existing) return;

  const db = mongoose.connection.db;
  const [legacyTasks, clientTasks, offers, reviews] = await Promise.all([
    db.collection('tasks').deleteMany({}),
    db.collection('clientTasks').deleteMany({}),
    db.collection('offers').deleteMany({}),
    db.collection('freelancerReviews').deleteMany({}),
  ]);

  await Migration.create({ id: MIGRATION_ID });

  console.log(
    `Task migration complete: removed ${legacyTasks.deletedCount} legacy task(s), ` +
      `${clientTasks.deletedCount} client task(s), ${offers.deletedCount} offer(s), ` +
      `${reviews.deletedCount} freelancer review(s). New client posts use clientTasks.`,
  );
}

module.exports = { migrateLegacyTasksToClientTasks };
