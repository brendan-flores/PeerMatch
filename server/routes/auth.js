const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sendVerificationEmail } = require('../utils/mailer');
const { authMiddleware, signAccessToken, attachAccessTokenCookie } = require('../middleware/auth');
const authController = require('../controllers/authController');
const { listFreelancerReviews } = require('../services/freelancerReviewService');
const {
  normalizeEmail,
  normalizeUsername,
  validateUsername,
} = require('../utils/userAuth');
const { sanitizePhotoDataUrl, INVALID_PHOTO_MESSAGE } = require('../utils/profilePhoto');

const router = express.Router();

const REGISTER_ACCOUNT_TYPES = ['client', 'freelancer'];

// Generate a random 6-digit numeric verification code.
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create a verification expiration date based on environment settings.
function getVerificationExpiration() {
  const ttlMinutes = Number(process.env.VERIFICATION_CODE_TTL_MINUTES || 10);
  return new Date(Date.now() + ttlMinutes * 60 * 1000);
}

function isInstitutionalEmail(email) {
  const domain = (process.env.INSTITUTIONAL_EMAIL_DOMAIN || 'cit.edu').trim().toLowerCase();
  const normalized = normalizeEmail(email);
  const atSuffix = `@${domain}`;
  return normalized.endsWith(atSuffix) || normalized.endsWith(`.${domain}`);
}

function serializeProfileUser(user) {
  return {
    id: String(user._id),
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    verified: user.verified,
    ...(user.accountType ? { accountType: user.accountType } : {}),
    ...(user.course ? { course: user.course } : {}),
    ...(user.yearLevel ? { yearLevel: user.yearLevel } : {}),
    ...(user.aboutMe ? { aboutMe: user.aboutMe } : {}),
    ...(user.skills ? { skills: user.skills } : {}),
    ...(user.location ? { location: user.location } : {}),
    photoDataUrl: typeof user.photoDataUrl === 'string' ? user.photoDataUrl : '',
    profileCompleted: user.profileCompleted,
  };
}

function safeString(value, max = 2000) {
  return String(value || '').trim().slice(0, max);
}

function safeInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function normalizeArray(value) {
  if (!Array.isArray(value)) return [];
  return value;
}

function sanitizeFreelancerProfile(input) {
  const profile = input && typeof input === 'object' ? input : {};

  const skills = normalizeArray(profile.skills)
    .slice(0, 10)
    .map((skill) => safeString(skill, 40))
    .filter(Boolean);
  const languages = normalizeArray(profile.languages)
    .slice(0, 10)
    .map((lang) => ({
      name: safeString(lang?.name, 40),
      proficiency: safeString(lang?.proficiency, 24) || 'Fluent',
    }))
    .filter((lang) => lang.name);

  const portfolio = normalizeArray(profile.portfolio)
    .slice(0, 8)
    .map((item) => ({
      title: safeString(item?.title, 80),
      description: safeString(item?.description, 240),
    }))
    .filter((item) => item.title || item.description);

  return {
    course: safeString(profile.course, 120),
    yearLevel: safeString(profile.yearLevel, 80),
    headline: safeString(profile.headline, 120),
    location: safeString(profile.location, 120),
    bio: safeString(profile.bio, 800),
    featuredWork: safeString(profile.featuredWork, 1200),
    availabilityLabel: safeString(profile.availabilityLabel, 40),
    availabilityHours: safeString(profile.availabilityHours, 120),
    sessions: safeInt(profile.sessions, 0),
    successRate: safeInt(profile.successRate, 0),
    responseTime: safeString(profile.responseTime, 40),
    skills,
    languages,
    portfolio,
  };
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role: registrationPersona } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const usernameCheck = validateUsername(username);

    if (!usernameCheck.ok || !normalizedEmail || !password) {
      return res.status(400).json({
        message: usernameCheck.ok
          ? 'Please provide username, email, and password.'
          : usernameCheck.message,
      });
    }

    const normalizedUsername = usernameCheck.username;

    if (String(registrationPersona || '').toLowerCase() === 'admin') {
      return res.status(400).json({ message: 'Admin accounts cannot be created through public registration.' });
    }

    const persona = String(registrationPersona || '').toLowerCase();
    const accountType = REGISTER_ACCOUNT_TYPES.includes(persona) ? persona : undefined;

    if (!isInstitutionalEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Please use your institutional Outlook email (e.g., name@cit.edu).' });
    }

    const userByEmail = await User.findOne({ email: normalizedEmail });
    if (userByEmail?.verified) {
      return res.status(409).json({ message: 'Email is already registered.' });
    }

    const userByUsername = await User.findOne({ username: normalizedUsername });
    if (userByUsername && userByUsername.email !== normalizedEmail) {
      return res.status(409).json({ message: 'Username is already taken.' });
    }

    const displayName = normalizedUsername;
    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationCode = generateVerificationCode();
    const expiresAt = getVerificationExpiration();

    let pending = userByEmail;

    if (pending) {
      pending.username = normalizedUsername;
      pending.name = displayName;
      pending.password = hashedPassword;
      pending.accountType = accountType;
      pending.verified = false;
      pending.verification = { code: verificationCode, expiresAt };
      await pending.save();
    } else {
      pending = await User.create({
        username: normalizedUsername,
        name: displayName,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'user',
        verified: false,
        ...(accountType ? { accountType } : {}),
        verification: { code: verificationCode, expiresAt },
      });
    }

    try {
      await sendVerificationEmail(pending.email, pending.name, verificationCode);
    } catch (mailError) {
      await User.deleteOne({ _id: pending._id, verified: false });
      const detail = mailError?.message || 'Unknown mail error';
      return res.status(502).json({
        message: `Could not send the verification email (${detail}). Check EMAIL_HOST, EMAIL_USER, and EMAIL_PASS on the API server (Render), then try again.`,
      });
    }

    return res.status(201).json({
      message: 'Verification code sent to email. Enter the code to verify your account.',
      email: pending.email,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !code) {
      return res.status(400).json({ message: 'Please provide email and verification code.' });
    }

    const pending = await User.findOne({ email: normalizedEmail, verified: false });
    if (!pending) {
      const existing = await User.findOne({ email: normalizedEmail, verified: true });
      if (existing) {
        return res.status(409).json({
          message: 'Email is already registered. Please log in.',
          email: normalizedEmail,
        });
      }
      return res.status(404).json({ message: 'No pending registration found. Please register again.' });
    }

    if (!pending.verification || pending.verification.code !== String(code)) {
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    if (pending.verification.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Verification code has expired.' });
    }

    pending.verified = true;
    pending.verification = undefined;
    pending.markModified('verification');
    await pending.save();

    const token = signAccessToken(pending);
    attachAccessTokenCookie(res, token);

    return res.json({
      message: 'Email verified successfully.',
      user: {
        id: pending._id,
        username: pending.username,
        name: pending.name,
        email: pending.email,
        role: pending.role,
        ...(pending.accountType ? { accountType: pending.accountType } : {}),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during verification.' });
  }
});

router.post('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, firstName, lastName, course, yearLevel, aboutMe, skills, location, photoDataUrl } =
      req.body || {};

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    if (!user.verified) {
      return res.status(403).json({ message: 'Please verify your email before completing your profile.' });
    }

    const firstStr = typeof firstName === 'string' ? String(firstName).trim() : '';
    const lastStr = typeof lastName === 'string' ? String(lastName).trim() : '';
    const combinedName = [firstStr, lastStr].filter(Boolean).join(' ');
    const nameStr =
      typeof name === 'string'
        ? String(name).trim()
        : combinedName;
    const courseStr = typeof course === 'string' ? String(course).trim() : '';
    const yearLevelStr = typeof yearLevel === 'string' ? String(yearLevel).trim() : '';
    const aboutMeStr = typeof aboutMe === 'string' ? String(aboutMe).trim() : '';
    const skillsStr = typeof skills === 'string' ? String(skills).trim() : '';
    const locationStr = typeof location === 'string' ? String(location).trim() : '';
    if (nameStr) user.name = nameStr;
    if (typeof course === 'string') user.course = courseStr;
    if (typeof yearLevel === 'string') user.yearLevel = yearLevelStr;
    if (typeof aboutMe === 'string') user.aboutMe = aboutMeStr;
    if (typeof skills === 'string') user.skills = skillsStr;
    if (typeof location === 'string') user.location = locationStr;
    if (typeof photoDataUrl === 'string') {
      const photoStr = sanitizePhotoDataUrl(photoDataUrl);
      if (photoDataUrl.trim() && photoStr === null) {
        return res.status(400).json({ message: INVALID_PHOTO_MESSAGE });
      }
      user.photoDataUrl = photoStr;
    }

    user.profileCompleted = Boolean(
      String(user.course || '').trim() ||
      String(user.yearLevel || '').trim() ||
      String(user.aboutMe || '').trim() ||
      String(user.skills || '').trim() ||
      String(user.photoDataUrl || '').trim()
    );

    await user.save();

    const savedUser = await User.findById(req.user.userId);

    return res.json({
      message: 'Profile saved.',
      photoDataUrl: typeof savedUser?.photoDataUrl === 'string' ? savedUser.photoDataUrl : '',
      user: serializeProfileUser(savedUser || user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error saving profile.' });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    const stored = sanitizeFreelancerProfile(user.freelancerProfile || {});
    const merged = {
      ...stored,
      course: stored.course || safeString(user.course, 120),
      yearLevel: stored.yearLevel || safeString(user.yearLevel, 80),
      bio: stored.bio || safeString(user.aboutMe, 800),
      skills: stored.skills.length
        ? stored.skills
        : String(user.skills || '')
            .split(',')
            .map((skill) => safeString(skill, 40))
            .filter(Boolean)
            .slice(0, 10),
    };

    const reviews =
      user.accountType === 'freelancer' ? await listFreelancerReviews(user._id) : [];

    return res.json({
      user: serializeProfileUser(user),
      profile: {
        name: safeString(user.name, 120),
        email: safeString(user.email, 160),
        accountType: safeString(user.accountType, 24),
        photoDataUrl: typeof user.photoDataUrl === 'string' ? user.photoDataUrl : '',
        ...merged,
        reviews,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error loading profile.' });
  }
});

/** Save profile photo only (client or freelancer) */
router.patch('/profile/photo', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    if (!user.verified) {
      return res.status(403).json({ message: 'Please verify your email before updating your profile photo.' });
    }

    if (typeof req.body?.photoDataUrl !== 'string') {
      return res.status(400).json({ message: 'Profile photo is required.' });
    }

    const photoStr = sanitizePhotoDataUrl(req.body.photoDataUrl);
    if (req.body.photoDataUrl.trim() && photoStr === null) {
      return res.status(400).json({ message: INVALID_PHOTO_MESSAGE });
    }

    user.photoDataUrl = photoStr;
    user.profileCompleted = Boolean(
      String(user.course || '').trim() ||
      String(user.yearLevel || '').trim() ||
      String(user.aboutMe || '').trim() ||
      String(user.skills || '').trim() ||
      String(user.photoDataUrl || '').trim()
    );
    await user.save();

    const fresh = await User.findById(req.user.userId);
    const photoDataUrl = typeof fresh?.photoDataUrl === 'string' ? fresh.photoDataUrl : '';

    return res.json({
      message: 'Profile photo saved.',
      user: serializeProfileUser(fresh || user),
      photoDataUrl,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error saving profile photo.' });
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    const nextName = safeString(req.body?.name, 120);
    const nextProfile = sanitizeFreelancerProfile(req.body?.profile || {});

    user.name = nextName || user.name;
    user.aboutMe = nextProfile.bio;
    user.skills = nextProfile.skills.join(', ');
    user.course = nextProfile.course;
    user.yearLevel = nextProfile.yearLevel;
    user.location = nextProfile.location;

    if (typeof req.body?.photoDataUrl === 'string') {
      const photoStr = sanitizePhotoDataUrl(req.body.photoDataUrl);
      if (req.body.photoDataUrl.trim() && photoStr === null) {
        return res.status(400).json({ message: INVALID_PHOTO_MESSAGE });
      }
      user.photoDataUrl = photoStr;
    }
    user.freelancerProfile = nextProfile;
    user.markModified('freelancerProfile');

    await user.save();

    const reviews =
      user.accountType === 'freelancer' ? await listFreelancerReviews(user._id) : [];

    return res.json({
      message: 'Profile updated successfully.',
      profile: {
        name: user.name,
        email: user.email,
        accountType: user.accountType || '',
        photoDataUrl: user.photoDataUrl || '',
        ...nextProfile,
        reviews,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating profile.' });
  }
});

// Resend a new verification code (primarily used after expiry).
router.post('/resend', async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Please provide email.' });
    }

    if (!isInstitutionalEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Please use your institutional Outlook email (e.g., name@cit.edu).' });
    }

    const verifiedUser = await User.findOne({ email: normalizedEmail, verified: true });
    if (verifiedUser) {
      return res.status(200).json({ message: 'User already verified.', email: normalizedEmail });
    }

    const pending = await User.findOne({ email: normalizedEmail, verified: false });
    if (!pending) {
      return res.status(404).json({ message: 'No pending registration found. Please register again.' });
    }

    const verificationCode = generateVerificationCode();
    const expiresAt = getVerificationExpiration();

    pending.verification = { code: verificationCode, expiresAt };
    await pending.save();

    await sendVerificationEmail(pending.email, pending.name, verificationCode);

    res.status(200).json({
      message: 'Verification code resent to email.',
      email: normalizedEmail,
    });
  } catch (error) {
    console.error(error);
    res.status(502).json({ message: `Could not deliver verification email: ${error.message}` });
  }
});

router.post('/login', (req, res) => void authController.login(req, res));

router.post('/logout', (req, res) => authController.logout(req, res));

router.get('/me', authMiddleware, (req, res) => void authController.getMe(req, res));

module.exports = router;
