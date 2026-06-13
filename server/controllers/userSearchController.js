const { isValidId } = require('../db/id');
const User = require('../models/User');

function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildNameTokenQuery(raw) {
  const q = String(raw || '').trim();
  if (!q) return null;

  const tokens = q
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6) // avoid very large queries
    .map(escapeRegex);

  if (!tokens.length) return null;

  // Match all tokens (partial, case-insensitive).
  return {
    $and: tokens.map((token) => ({
      name: { $regex: token, $options: 'i' },
    })),
  };
}

/**
 * GET /api/users/search?q=<name partial OR exact ObjectId>
 * Returns: { users: [{ id, name }] }
 */
async function searchUsers(req, res) {
  try {
    const q = String(req.query?.q || '').trim();
    if (!q) return res.json({ users: [] });

    const nameQuery = buildNameTokenQuery(q);
    const isUuid = isValidId(q);

    // If query is an exact ObjectId, return that user (if allowed).
    if (isUuid) {
      const user = await User.findById(q)
        .select('name photoDataUrl')
        .lean();

      if (!user) return res.json({ users: [] });
      return res.json({
        users: [
          {
            id: String(q),
            name: user.name,
            photoDataUrl: typeof user.photoDataUrl === 'string' ? user.photoDataUrl : '',
          },
        ],
      });
    }

    // Otherwise, do partial name search.
    if (!nameQuery) return res.json({ users: [] });

    const users = await User.find({
      verified: true,
      suspended: { $ne: true },
      ...nameQuery,
    })
      .select('name photoDataUrl')
      .sort({ name: 1 })
      .limit(10)
      .lean();

    return res.json({
      users: users.map((u) => ({
        id: String(u._id),
        name: u.name,
        photoDataUrl: typeof u.photoDataUrl === 'string' ? u.photoDataUrl : '',
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Could not search users.' });
  }
}

module.exports = {
  searchUsers,
};

