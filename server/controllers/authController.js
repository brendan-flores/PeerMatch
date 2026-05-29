const bcrypt = require('bcryptjs');
const User = require('../models/User');
const {
  signAccessToken,
  attachAccessTokenCookieForReq,
  clearAccessTokenCookieForReq,
} = require('../middleware/auth');
const { findUserByLoginIdentifier } = require('../utils/userAuth');

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

    if (user.suspended) {
      return res.status(403).json({ message: 'This account has been suspended.' });
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

/** POST /api/admin/auth/login — admin role required */
async function loginAsAdmin(req, res) {
  try {
    const { email, password } = req.body;
    const identifier = String(email || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Please provide email or username and password.' });
    }

    const user = await findUserByLoginIdentifier(identifier);
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ message: 'Invalid admin credentials.' });
    }

    if (user.suspended) {
      return res.status(403).json({ message: 'This account has been suspended.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin credentials.' });
    }

    if (!user.verified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
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
      'username name email role verified accountType photoDataUrl suspended',
    );
    if (!user) {
      clearAccessTokenCookieForReq(req, res);
      return res.status(401).json({ message: 'Account not found.' });
    }
    if (user.suspended) {
      clearAccessTokenCookieForReq(req, res);
      return res.status(403).json({ message: 'This account has been suspended.' });
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

module.exports = {
  login,
  loginAsAdmin,
  logout,
  getMe,
};
