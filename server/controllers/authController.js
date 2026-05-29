const bcrypt = require('bcryptjs');
const User = require('../models/User');
const {
  signAccessToken,
  attachAccessTokenCookieForReq,
  clearAccessTokenCookieForReq,
} = require('../middleware/auth');
const { findUserByLoginIdentifier } = require('../utils/userAuth');
const { sendVerificationEmail } = require('../utils/email.service');

/**
 * POST /api/auth/login — validates institutional email or username + password.
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const identifier = String(email || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Please provide email or username and password.' });
    }

    const user = await findUserByLoginIdentifier(identifier);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (!user.verified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
        email: user.email,
      });
    }

    const token = signAccessToken(user);
    attachAccessTokenCookieForReq(req, res, token);

    return res.json({
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        ...(user.accountType ? { accountType: user.accountType } : {}),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error during login.' });
  }
}

function logout(req, res) {
  clearAccessTokenCookieForReq(req, res);
  return res.status(204).send();
}

/** GET /api/auth/me — requires authMiddleware upstream */
async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.userId).select(
      'username name email role verified accountType photoDataUrl',
    );
    if (!user) {
      clearAccessTokenCookieForReq(req, res);
      return res.status(401).json({ message: 'Account not found.' });
    }
    return res.json({
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.verified,
        ...(user.accountType ? { accountType: user.accountType } : {}),
        photoDataUrl: typeof user.photoDataUrl === 'string' ? user.photoDataUrl : '',
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error loading session.' });
  }
}

/**
 * POST /api/auth/register — creates new user and sends verification email
 */
async function register(req, res) {
  try {
    const { username, email, password, name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide username, email, and password.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.trim() });
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already registered.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    const user = await User.create({
      username: username.trim(),
      email: email.trim(),
      name: name || username,
      password: hashedPassword,
      role: 'user',
      verified: false,
      verification: { code: verificationCode, expiresAt },
    });

    // Send verification email
    try {
      await sendVerificationEmail(user.email, user.name, verificationCode);
    } catch (mailError) {
      console.error('Verification email failed:', user.email, mailError?.message);
      // Continue anyway - user can request resend
    }

    return res.status(201).json({
      message: 'Registration successful. Please check your email for verification code.',
      email: user.email,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error during registration.' });
  }
}

module.exports = {
  login,
  logout,
  getMe,
  register,
};
