const express = require('express');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/auth');
const {
  mapNotificationToDto,
  enrichNotificationsWithActorPhotos,
} = require('../services/notificationService');

const router = express.Router();

/** List notifications for the authenticated user (newest first) */
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.user.userId)) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    const docs = await Notification.find({ recipientId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const notifications = await enrichNotificationsWithActorPhotos(docs);
    res.json({ notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load notifications.' });
  }
});

/** Mark all notifications as read */
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.user.userId)) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    await Notification.updateMany({ recipientId: req.user.userId, read: false }, { $set: { read: true } });

    const docs = await Notification.find({ recipientId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const notifications = await enrichNotificationsWithActorPhotos(docs);
    res.json({ notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not update notifications.' });
  }
});

/** Delete a single notification */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid notification id.' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.user.userId)) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    const doc = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipientId: req.user.userId,
    }).lean();

    if (!doc) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not delete notification.' });
  }
});

/** Mark a single notification as read */
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid notification id.' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.user.userId)) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    const doc = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user.userId },
      { $set: { read: true } },
      { new: true },
    ).lean();

    if (!doc) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    const [notification] = await enrichNotificationsWithActorPhotos([doc]);
    res.json({ notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not update notification.' });
  }
});

module.exports = router;
