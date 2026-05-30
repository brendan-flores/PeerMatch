const express = require('express');
const mongoose = require('mongoose');
const ClientTask = require('../models/ClientTask');
const Offer = require('../models/Offer');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { mapTaskToFeedPost } = require('../utils/taskFeedDto');
const { photoDataUrlForFeed } = require('../utils/profilePhoto');
const {
  notifyClientNewOffer,
  notifyFreelancerOfferAccepted,
  notifyFreelancerOfferRejected,
} = require('../services/notificationService');

const router = express.Router();

function normalizeOfferStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'accepted' || value === 'rejected') return value;
  return 'pending';
}

function mapOfferDto(offer, freelancerPhoto) {
  return {
    id: String(offer._id),
    postId: String(offer.postId),
    postTitle: String(offer.postTitle || ''),
    freelancerId: String(offer.freelancerId?._id || offer.freelancerId),
    freelancerName: String(offer.freelancerName || ''),
    clientId: String(offer.clientId),
    message: String(offer.message || ''),
    rate: offer.rate ? String(offer.rate) : undefined,
    status: normalizeOfferStatus(offer.status),
    createdAt: offer.createdAt ? new Date(offer.createdAt).toISOString() : new Date().toISOString(),
    ...(freelancerPhoto ? { freelancerPhotoDataUrl: freelancerPhoto } : {}),
  };
}

/** Client lists all offers on their posts */
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('accountType role suspended').lean();
    if (!user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (user.suspended) {
      return res.status(403).json({ message: 'Your account is suspended.' });
    }
    if (user.role !== 'user' || user.accountType !== 'client') {
      return res.status(403).json({ message: 'Only client accounts can view incoming offers.' });
    }

    const offers = await Offer.find({ clientId: req.user.userId })
      .populate('freelancerId', 'photoDataUrl')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const postIds = [
      ...new Set(
        offers
          .map((offer) => String(offer.postId || ''))
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id)),
      ),
    ];

    const [client, tasks] = await Promise.all([
      User.findById(req.user.userId)
        .select('name email accountType photoDataUrl')
        .lean(),
      postIds.length > 0
        ? ClientTask.find({ _id: { $in: postIds }, clientId: req.user.userId }).lean()
        : [],
    ]);

    const freelancerIds = [
      ...new Set(
        tasks
          .map((task) =>
            task.assignedFreelancerId ? String(task.assignedFreelancerId) : '',
          )
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id)),
      ),
    ];

    const freelancers =
      freelancerIds.length > 0
        ? await User.find({ _id: { $in: freelancerIds } }).select('name').lean()
        : [];

    const freelancerById = new Map(freelancers.map((f) => [String(f._id), f]));

    res.json({
      offers: offers.map((offer) => {
        const freelancerPhoto = photoDataUrlForFeed(offer.freelancerId?.photoDataUrl);
        return mapOfferDto(offer, freelancerPhoto);
      }),
      posts: tasks.map((task) => {
        const assigned = freelancerById.get(String(task.assignedFreelancerId || ''));
        return mapTaskToFeedPost(
          { ...task, assignedFreelancerName: assigned?.name || undefined },
          client,
        );
      }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load offers.' });
  }
});

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

    const task = await ClientTask.findOne({
      _id: postId,
      status: 'approved',
      $or: [
        { hireStatus: { $in: ['open', null] } },
        { hireStatus: { $exists: false } },
      ],
    })
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
      status: 'pending',
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
      offer: mapOfferDto(offer),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not send offer. Please try again.' });
  }
});

/** Client accepts a freelancer offer for a task */
router.patch('/:id/accept', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid offer id.' });
    }

    const user = await User.findById(req.user.userId).select('accountType role suspended name').lean();
    if (!user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (user.suspended) {
      return res.status(403).json({ message: 'Your account is suspended.' });
    }
    if (user.role !== 'user' || user.accountType !== 'client') {
      return res.status(403).json({ message: 'Only client accounts can accept offers.' });
    }

    const offer = await Offer.findById(req.params.id).lean();
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found.' });
    }
    if (String(offer.clientId) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'You do not have permission to accept this offer.' });
    }
    const offerStatus = normalizeOfferStatus(offer.status);
    if (offerStatus !== 'pending') {
      return res.status(400).json({ message: 'This offer is no longer available.' });
    }

    const task = await ClientTask.findById(offer.postId);
    if (!task) {
      return res.status(404).json({ message: 'Associated post not found.' });
    }
    if (String(task.clientId) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'You do not own this post.' });
    }
    const hireStatus = task.hireStatus || 'open';
    if (hireStatus !== 'open') {
      return res.status(409).json({ message: 'This post already has an assigned freelancer.' });
    }
    if (task.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved posts can accept offers.' });
    }

    await Offer.updateOne({ _id: offer._id }, { $set: { status: 'accepted' } });
    await Offer.updateMany(
      { postId: offer.postId, _id: { $ne: offer._id }, status: 'pending' },
      { $set: { status: 'rejected' } },
    );

    task.hireStatus = 'assigned';
    task.assignedFreelancerId = offer.freelancerId;
    await task.save();

    const clientName = String(user.name || '').trim() || 'A client';
    try {
      await notifyFreelancerOfferAccepted({
        freelancerId: String(offer.freelancerId),
        clientId: String(req.user.userId),
        clientName,
        taskId: String(offer.postId),
        offerId: String(offer._id),
        taskTitle: String(offer.postTitle || task.title || '').trim(),
      });
    } catch (notifyErr) {
      console.error('Notification dispatch failed after offer accept:', notifyErr);
    }

    const updated = await Offer.findById(offer._id).lean();
    res.json({
      message: 'Offer accepted. The freelancer has been assigned to your task.',
      offer: mapOfferDto(updated),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not accept the offer.' });
  }
});

/** Client rejects a single pending offer (does not assign a freelancer) */
router.patch('/:id/reject', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid offer id.' });
    }

    const user = await User.findById(req.user.userId).select('accountType role suspended name').lean();
    if (!user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (user.suspended) {
      return res.status(403).json({ message: 'Your account is suspended.' });
    }
    if (user.role !== 'user' || user.accountType !== 'client') {
      return res.status(403).json({ message: 'Only client accounts can reject offers.' });
    }

    const offer = await Offer.findById(req.params.id).lean();
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found.' });
    }
    if (String(offer.clientId) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'You do not have permission to reject this offer.' });
    }

    const offerStatus = normalizeOfferStatus(offer.status);
    if (offerStatus !== 'pending') {
      return res.status(400).json({ message: 'This offer is no longer available.' });
    }

    const task = await ClientTask.findById(offer.postId).select('title hireStatus clientId status').lean();
    if (!task) {
      return res.status(404).json({ message: 'Associated post not found.' });
    }
    if (String(task.clientId) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'You do not own this post.' });
    }

    const hireStatus = task.hireStatus || 'open';
    if (hireStatus !== 'open') {
      return res.status(409).json({ message: 'This post already has an assigned freelancer.' });
    }

    await Offer.updateOne({ _id: offer._id }, { $set: { status: 'rejected' } });

    const clientName = String(user.name || '').trim() || 'A client';
    try {
      await notifyFreelancerOfferRejected({
        freelancerId: String(offer.freelancerId),
        clientId: String(req.user.userId),
        clientName,
        taskId: String(offer.postId),
        offerId: String(offer._id),
        taskTitle: String(offer.postTitle || task.title || '').trim(),
      });
    } catch (notifyErr) {
      console.error('Notification dispatch failed after offer reject:', notifyErr);
    }

    const updated = await Offer.findById(offer._id).lean();
    res.json({
      message: 'Offer rejected.',
      offer: mapOfferDto(updated),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not reject the offer.' });
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
