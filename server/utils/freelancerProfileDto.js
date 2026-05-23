function safeString(value, max = 2000) {
  return String(value || '').trim().slice(0, max);
}

function sanitizeFreelancerProfile(input) {
  const profile = input && typeof input === 'object' ? input : {};

  return {
    course: safeString(profile.course, 120),
    yearLevel: safeString(profile.yearLevel, 80),
    headline: safeString(profile.headline, 120),
    bio: safeString(profile.bio, 800),
  };
}

function buildPublicFreelancerProfile(user, reviews = []) {
  if (!user) return null;

  const stored = sanitizeFreelancerProfile(user.freelancerProfile || {});

  return {
    id: String(user._id),
    name: safeString(user.name, 120),
    photoDataUrl: typeof user.photoDataUrl === 'string' ? user.photoDataUrl : '',
    course: stored.course || safeString(user.course, 120),
    yearLevel: stored.yearLevel || safeString(user.yearLevel, 80),
    headline: stored.headline,
    bio: stored.bio || safeString(user.aboutMe, 800),
    reviews: Array.isArray(reviews) ? reviews : [],
  };
}

module.exports = {
  buildPublicFreelancerProfile,
};
