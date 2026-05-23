/**
 * Drops legacy MongoDB collections replaced by `clientTasks` and current auth flows.
 */
const OBSOLETE_COLLECTIONS = ['tasks', 'pendingregistrations', 'pendingRegistrations', 'migrations'];

async function dropObsoleteCollections(db) {
  if (!db) return [];

  const dropped = [];

  for (const name of OBSOLETE_COLLECTIONS) {
    try {
      const collections = await db.listCollections({ name }).toArray();
      if (collections.length === 0) continue;
      await db.collection(name).drop();
      dropped.push(name);
    } catch (error) {
      console.error(`Failed to drop collection "${name}":`, error.message);
    }
  }

  return dropped;
}

module.exports = { OBSOLETE_COLLECTIONS, dropObsoleteCollections };
