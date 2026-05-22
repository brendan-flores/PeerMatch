const mongoose = require('mongoose');
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
 * GET /api/users/resolve?q=<input>
 * If `q` is an ObjectId -> resolve directly.
 * Otherwise -> resolve by partial/full name (case-insensitive).
 */
async function resolveUser(req, res) {
  try {
    const q = String(req.query?.q || '').trim();
    if (!q) return res.status(400).json({ message: 'Query is required.' });

    const baseFilters = {
      verified: true,
      suspended: { $ne: true },
    };

    // Direct ObjectId resolve.
    if (mongoose.Types.ObjectId.isValid(q)) {
      const user = await User.findById(q).select('name email accountType photoDataUrl').lean();
      return res.json({
        user: user
          ? {
              id: String(user._id),
              name: user.name,
              email: user.email,
              accountType: user.accountType || null,
              photoDataUrl: typeof user.photoDataUrl === 'string' ? user.photoDataUrl : '',
            }
          : null,
      });
    }

    const nameQuery = buildNameTokenQuery(q);
    if (!nameQuery) return res.json({ user: null });

    const user = await User.findOne({
      ...baseFilters,
      ...nameQuery,
    })
      .select('name email accountType photoDataUrl')
      .lean();

    return res.json({
      user: user
        ? {
            id: String(user._id),
            name: user.name,
            email: user.email,
            accountType: user.accountType || null,
            photoDataUrl: typeof user.photoDataUrl === 'string' ? user.photoDataUrl : '',
          }
        : null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Could not resolve user.' });
  }
}

module.exports = {
  resolveUser,
};

