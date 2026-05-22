const User = require('../models/User');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function validateUsername(username) {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    return { ok: false, message: 'Please choose a username.' };
  }
  if (normalized.length < 3 || normalized.length > 30) {
    return { ok: false, message: 'Username must be 3–30 characters.' };
  }
  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return {
      ok: false,
      message: 'Username may only contain letters, numbers, and underscores.',
    };
  }
  return { ok: true, username: normalized };
}

function isEmailIdentifier(value) {
  return String(value || '').includes('@');
}

async function findUserByLoginIdentifier(identifier) {
  const raw = String(identifier || '').trim();
  if (!raw) return null;

  if (isEmailIdentifier(raw)) {
    return User.findOne({ email: normalizeEmail(raw) });
  }

  return User.findOne({ username: normalizeUsername(raw) });
}

module.exports = {
  normalizeEmail,
  normalizeUsername,
  validateUsername,
  isEmailIdentifier,
  findUserByLoginIdentifier,
};
