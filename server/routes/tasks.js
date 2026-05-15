const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { mapTaskToFeedPost, normalizeUrgency } = require('../utils/taskFeedDto');

const router = express.Router();

/** Public feed: approved community posts only */
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find({ status: 'approved' })
      .populate('clientId', 'name email accountType photoDataUrl')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ posts: tasks.map((task) => mapTaskToFeedPost(task)) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load posts.' });
  }
});

/** Authenticated client's posts (all moderation statuses) */
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.user.userId)) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    const tasks = await Task.find({ clientId: req.user.userId })
      .populate('clientId', 'name email accountType photoDataUrl')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ posts: tasks.map((task) => mapTaskToFeedPost(task)) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load your posts.' });
  }
});

/** Client submits a post for admin review (saved as pending task) */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('accountType role suspended verified').lean();
    if (!user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (user.suspended) {
      return res.status(403).json({ message: 'Your account is suspended.' });
    }
    if (user.role !== 'user' || user.accountType !== 'client') {
      return res.status(403).json({ message: 'Only client accounts can create posts.' });
    }

    const title = String(req.body?.title || '').trim().slice(0, 120);
    const description = String(req.body?.description || req.body?.content || '').trim().slice(0, 1200);
    const subjectCategory = String(req.body?.subjectCategory || req.body?.category || '').trim().slice(0, 80);
    const urgency = normalizeUrgency(req.body?.urgency || req.body?.priority);
    const categoryRaw = String(req.body?.categoryType || req.body?.taskCategory || 'academic').trim().toLowerCase();
    const category = categoryRaw === 'non-academic' ? 'non-academic' : 'academic';

    if (!title || !description || !subjectCategory) {
      return res.status(400).json({ message: 'Category, title, and description are required.' });
    }

    const task = await Task.create({
      title,
      description,
      subjectCategory,
      urgency,
      clientId: req.user.userId,
      budget: 0,
      category,
      status: 'pending',
      flagged: urgency === 'high',
    });

    const populated = await Task.findById(task._id)
      .populate('clientId', 'name email accountType photoDataUrl')
      .lean();

    res.status(201).json({
      message: 'Your post is under review and waiting for approval.',
      post: mapTaskToFeedPost(populated),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not save your post. Please try again.' });
  }
});

module.exports = router;
