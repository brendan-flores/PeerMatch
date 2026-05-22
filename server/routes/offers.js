const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Offer = require('../models/Offer');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { notifyClientNewOffer } = require('../services/notificationService');

const router = express.Router();

/** Freelancer submits an offer on an approved community post */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('name accountType role suspended').lean();
    if (!user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (user.suspended) {
      return res.status(403).json({ message: 'Your account is suspended.' });
    }
    if (user.role !== 'user' || user.accountType !== 'freelancer') {
      return res.status(403).json({ message: 'Only freelancer accounts can send offers.' });
    }

    const postId = String(req.body?.postId || '').trim();
    const message = String(req.body?.message || '').trim().slice(0, 500);
    const rate = String(req.body?.rate || '').trim().slice(0, 40);
    const postTitle = String(req.body?.postTitle || '').trim().slice(0, 120);

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post id.' });
    }
    if (!message) {
      return res.status(400).json({ message: 'Offer message is required.' });
    }

    const task = await Task.findOne({ _id: postId, status: 'approved' })
      .populate('clientId', 'name')
      .lean();

    if (!task) {
      return res.status(404).json({ message: 'Post not found or not available for offers.' });
    }

    const clientId = task.clientId?._id ? String(task.clientId._id) : String(task.clientId);
    if (!clientId) {
      return res.status(400).json({ message: 'Post has no associated client.' });
    }
    if (clientId === String(req.user.userId)) {
      return res.status(400).json({ message: 'You cannot send an offer on your own post.' });
    }

    const existing = await Offer.findOne({ postId, freelancerId: req.user.userId }).lean();
    if (existing) {
      return res.status(409).json({ message: 'You have already sent an offer for this post.' });
    }

    const freelancerName = String(user.name || '').trim() || 'Freelancer';
    const title = postTitle || String(task.title || '').trim();

    const offer = await Offer.create({
      postId,
      postTitle: title,
      freelancerId: req.user.userId,
      freelancerName,
      clientId,
      rate,
      message,
    });

    await notifyClientNewOffer({
      clientId,
      freelancerId: String(req.user.userId),
      freelancerName,
      taskId: postId,
      offerId: String(offer._id),
    });

    res.status(201).json({
      message: 'Offer sent successfully.',
      offer: {
        id: String(offer._id),
        postId,
        postTitle: title,
        freelancerId: String(offer.freelancerId),
        freelancerName,
        clientId,
        message,
        rate: rate || undefined,
        createdAt: offer.createdAt ? new Date(offer.createdAt).toISOString() : new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not send offer. Please try again.' });
  }
});

/** Check if the current freelancer already offered on a post */
router.get('/check', authMiddleware, async (req, res) => {
  try {
    const postId = String(req.query?.postId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post id.' });
    }

    const existing = await Offer.findOne({ postId, freelancerId: req.user.userId }).lean();
    res.json({ hasOffer: !!existing });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not check offer status.' });
  }
});

module.exports = router;
