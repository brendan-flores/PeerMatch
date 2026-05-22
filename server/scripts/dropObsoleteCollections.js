/**
 * Drops legacy MongoDB collections no longer used by the app.
 * Usage: node server/scripts/dropObsoleteCollections.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const OBSOLETE_COLLECTIONS = ['tasks', 'pendingregistrations', 'migrations'];

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/peer-match';
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  for (const name of OBSOLETE_COLLECTIONS) {
    try {
      const collections = await db.listCollections({ name }).toArray();
      if (collections.length === 0) {
        console.log(`Skip (not found): ${name}`);
        continue;
      }
      await db.collection(name).drop();
      console.log(`Dropped: ${name}`);
    } catch (error) {
      console.error(`Failed to drop ${name}:`, error.message);
    }
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
