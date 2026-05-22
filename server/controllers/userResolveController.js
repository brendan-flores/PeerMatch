const mongoose = require('mongoose');
const User = require('../models/User');
const { buildPublicFreelancerProfile } = require('../utils/freelancerProfileDto');
const { listFreelancerReviews } = require('../services/freelancerReviewService');

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
      const user = await User.findById(q).select('name email accountType').lean();
      return res.json({
        user: user
          ? {
              id: String(user._id),
              name: user.name,
              email: user.email,
              accountType: user.accountType || null,
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
      .select('name email accountType')
      .lean();

    return res.json({
      user: user
        ? {
            id: String(user._id),
            name: user.name,
            email: user.email,
            accountType: user.accountType || null,
          }
        : null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Could not resolve user.' });
  }
}

/**
 * GET /api/users/:userId/freelancer-profile
 * Public freelancer profile for clients reviewing offers.
 */
async function getFreelancerPublicProfile(req, res) {
  try {
    const userId = String(req.params?.userId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    const user = await User.findOne({
      _id: userId,
      accountType: 'freelancer',
      verified: true,
      suspended: { $ne: true },
    })
      .select('name photoDataUrl course yearLevel aboutMe freelancerProfile accountType')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'Freelancer profile not found.' });
    }

    const reviews = await listFreelancerReviews(userId);
    const profile = buildPublicFreelancerProfile(user, reviews);
    return res.json({ profile });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Could not load freelancer profile.' });
  }
}

module.exports = {
  resolveUser,
  getFreelancerPublicProfile,
};

