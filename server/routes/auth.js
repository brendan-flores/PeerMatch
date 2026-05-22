const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PendingRegistration = require('../models/PendingRegistration');
const { sendVerificationEmail } = require('../utils/mailer');
const { authMiddleware, signAccessToken, attachAccessTokenCookie } = require('../middleware/auth');
const authController = require('../controllers/authController');
const {
  normalizeEmail,
  normalizeUsername,
  validateUsername,
} = require('../utils/userAuth');

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
  return normalizeEmail(email).endsWith(`@${domain}`);
}

function serializeProfileUser(user) {
  return {
    id: user._id,
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
    ...(user.photoDataUrl ? { photoDataUrl: user.photoDataUrl } : {}),
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

  const reviews = normalizeArray(profile.reviews)
    .slice(0, 10)
    .map((item) => ({
      reviewer: safeString(item?.reviewer, 60),
      text: safeString(item?.text, 280),
      rating: Math.max(1, Math.min(5, safeInt(item?.rating, 5))),
    }))
    .filter((item) => item.reviewer || item.text);

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
    reviews,
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

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });
    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        return res.status(409).json({ message: 'Email is already registered.' });
      }
      return res.status(409).json({ message: 'Username is already taken.' });
    }

    const usernameTaken = await PendingRegistration.findOne({ username: normalizedUsername });
    if (usernameTaken && usernameTaken.email !== normalizedEmail) {
      return res.status(409).json({ message: 'Username is already taken.' });
    }

    const displayName = normalizedUsername;
    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationCode = generateVerificationCode();
    const expiresAt = getVerificationExpiration();

    // IMPORTANT: Do not create a real `User` until verification succeeds.
    // If the user tries to register again with the same email, rotate the code and resend.
    let pending = await PendingRegistration.findOne({ email: normalizedEmail });

    if (pending) {
      pending.username = normalizedUsername;
      pending.name = displayName;
      pending.password = hashedPassword;
      pending.accountType = accountType;
      pending.verification = { code: verificationCode, expiresAt };
      await pending.save();
    } else {
      pending = await PendingRegistration.create({
        username: normalizedUsername,
        name: displayName,
        email: normalizedEmail,
        password: hashedPassword,
        ...(accountType ? { accountType } : {}),
        verification: { code: verificationCode, expiresAt },
      });
    }

    try {
      await sendVerificationEmail(pending.email, pending.name, verificationCode);
    } catch (mailError) {
      await PendingRegistration.deleteOne({ _id: pending._id });
      return res.status(502).json({
        message: `Registration failed because verification email could not be delivered: ${mailError.message}`,
      });
    }

    return res.status(201).json({
      message: 'Verification code sent to email. Enter the code to create your account.',
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

    const alreadyUser = await User.findOne({ email: normalizedEmail });
    if (alreadyUser) {
      return res.status(409).json({ message: 'Email is already registered. Please log in.', email: normalizedEmail });
    }

    const pending = await PendingRegistration.findOne({ email: normalizedEmail });
    if (!pending) {
      return res.status(404).json({ message: 'No pending registration found. Please register again.' });
    }

    if (!pending.verification || pending.verification.code !== String(code)) {
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    if (pending.verification.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Verification code has expired.' });
    }

    const createdUser = await User.create({
      username: pending.username,
      name: pending.name,
      email: pending.email,
      password: pending.password,
      role: 'user',
      ...(pending.accountType ? { accountType: pending.accountType } : {}),
      verified: true,
      createdAt: new Date(),
    });

    await PendingRegistration.deleteOne({ _id: pending._id });

    // Log the user in immediately so they can complete their profile.
    const token = signAccessToken(createdUser);
    attachAccessTokenCookie(res, token);

    return res.json({
      message: 'Email verified successfully. Account created.',
      user: {
        id: createdUser._id,
        username: createdUser.username,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        ...(createdUser.accountType ? { accountType: createdUser.accountType } : {}),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during verification.' });
  }
});

router.post('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, course, yearLevel, aboutMe, skills, location, photoDataUrl } = req.body || {};

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    if (!user.verified) {
      return res.status(403).json({ message: 'Please verify your email before completing your profile.' });
    }

    const nameStr = typeof name === 'string' ? String(name).trim() : '';
    const courseStr = typeof course === 'string' ? String(course).trim() : '';
    const yearLevelStr = typeof yearLevel === 'string' ? String(yearLevel).trim() : '';
    const aboutMeStr = typeof aboutMe === 'string' ? String(aboutMe).trim() : '';
    const skillsStr = typeof skills === 'string' ? String(skills).trim() : '';
    const locationStr = typeof location === 'string' ? String(location).trim() : '';
    const photoStr = typeof photoDataUrl === 'string' ? photoDataUrl : '';

    if (typeof name === 'string') user.name = nameStr || user.name;
    if (typeof course === 'string') user.course = courseStr;
    if (typeof yearLevel === 'string') user.yearLevel = yearLevelStr;
    if (typeof aboutMe === 'string') user.aboutMe = aboutMeStr;
    if (typeof skills === 'string') user.skills = skillsStr;
    if (typeof location === 'string') user.location = locationStr;
    if (typeof photoDataUrl === 'string') user.photoDataUrl = photoStr;

    user.profileCompleted = Boolean(
      String(user.course || '').trim() ||
      String(user.yearLevel || '').trim() ||
      String(user.aboutMe || '').trim() ||
      String(user.skills || '').trim() ||
      String(user.photoDataUrl || '').trim()
    );

    await user.save();

    return res.json({
      message: 'Profile saved.',
      user: serializeProfileUser(user),
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

    return res.json({
      user: serializeProfileUser(user),
      profile: {
        name: safeString(user.name, 120),
        email: safeString(user.email, 160),
        accountType: safeString(user.accountType, 24),
        photoDataUrl: typeof user.photoDataUrl === 'string' ? user.photoDataUrl : '',
        ...merged,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error loading profile.' });
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    const nextName = safeString(req.body?.name, 120);
    const nextPhotoDataUrl = typeof req.body?.photoDataUrl === 'string' ? req.body.photoDataUrl : '';
    const nextProfile = sanitizeFreelancerProfile(req.body?.profile || {});

    user.name = nextName || user.name;
    user.aboutMe = nextProfile.bio;
    user.skills = nextProfile.skills.join(', ');
    user.course = nextProfile.course;
    user.yearLevel = nextProfile.yearLevel;
    user.location = nextProfile.location;
    user.photoDataUrl = nextPhotoDataUrl;
    user.freelancerProfile = nextProfile;
    user.markModified('freelancerProfile');

    await user.save();

    return res.json({
      message: 'Profile updated successfully.',
      profile: {
        name: user.name,
        email: user.email,
        accountType: user.accountType || '',
        photoDataUrl: user.photoDataUrl || '',
        ...nextProfile,
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

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(200).json({ message: 'User already verified.', email: normalizedEmail });
    }

    const pending = await PendingRegistration.findOne({ email: normalizedEmail });
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
