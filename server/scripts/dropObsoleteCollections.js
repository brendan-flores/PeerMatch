/**
 * Drops legacy MongoDB collections no longer used by the app.
 * Usage: npm run db:drop-obsolete
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { dropObsoleteCollections } = require('../utils/dropObsoleteCollections');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/peer-match';
  await mongoose.connect(uri);
  const dropped = await dropObsoleteCollections(mongoose.connection.db);
  dropped.forEach((name) => console.log(`Dropped: ${name}`));
  if (dropped.length === 0) console.log('No obsolete collections found.');
  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
