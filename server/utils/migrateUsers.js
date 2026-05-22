const User = require('../models/User');
const { normalizeUsername } = require('./userAuth');

/**
 * Backfill username for legacy accounts (pre-username signup).
 */
async function migrateUsersWithoutUsername() {
  const legacy = await User.find({
    $or: [{ username: { $exists: false } }, { username: null }, { username: '' }],
  }).select('_id email name');

  if (!legacy.length) return;

  for (const user of legacy) {
    const emailLocal = String(user.email || '').split('@')[0] || 'user';
    const fromName = String(user.name || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
    let base = normalizeUsername(fromName || emailLocal) || 'user';
    if (base.length < 3) base = `${base}_pm`.slice(0, 30);

    let candidate = base.slice(0, 30);
    let suffix = 0;
    // eslint-disable-next-line no-await-in-loop
    while (await User.findOne({ username: candidate, _id: { $ne: user._id } })) {
      suffix += 1;
      candidate = `${base.slice(0, 24)}_${suffix}`.slice(0, 30);
    }

    user.username = candidate;
    // eslint-disable-next-line no-await-in-loop
    await user.save();
  }

  console.log(`Migrated ${legacy.length} user(s) with generated username(s).`);
}

module.exports = { migrateUsersWithoutUsername };
