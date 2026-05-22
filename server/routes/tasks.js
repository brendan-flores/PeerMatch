const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { mapTaskToFeedPost, normalizeUrgency } = require('../utils/taskFeedDto');
const { parseBudget } = require('../utils/budgetValidation');
const { suggestBudgetWithOpenAI } = require('../services/suggestBudget');
const {
  notifyFreelancersNewTask,
  notifyClientPostReview,
  notifyFreelancerTaskCompleted,
} = require('../services/notificationService');

const router = express.Router();

async function loadClientsForTasks(tasks) {
  const clientIds = [
    ...new Set(
      tasks
        .map((task) => (task.clientId ? String(task.clientId) : ''))
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id)),
    ),
  ];
  if (clientIds.length === 0) return new Map();

  const clients = await User.find({ _id: { $in: clientIds } })
    .select('name email accountType photoDataUrl')
    .lean();
  return new Map(clients.map((client) => [String(client._id), client]));
}

/** Public feed: approved community posts open for offers */
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find({
      status: 'approved',
      $or: [
        { hireStatus: { $in: ['open', null] } },
        { hireStatus: { $exists: false } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const clientById = await loadClientsForTasks(tasks);
    res.json({
      posts: tasks.map((task) =>
        mapTaskToFeedPost(task, clientById.get(String(task.clientId)) || null),
      ),
    });
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
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const clientById = await loadClientsForTasks(tasks);
    const freelancerIds = [
      ...new Set(
        tasks
          .map((task) => (task.assignedFreelancerId ? String(task.assignedFreelancerId) : ''))
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id)),
      ),
    ];
    const freelancers =
      freelancerIds.length > 0
        ? await User.find({ _id: { $in: freelancerIds } }).select('name').lean()
        : [];
    const freelancerById = new Map(freelancers.map((f) => [String(f._id), f]));

    res.json({
      posts: tasks.map((task) => {
        const assigned = freelancerById.get(String(task.assignedFreelancerId || ''));
        return mapTaskToFeedPost(
          { ...task, assignedFreelancerName: assigned?.name || undefined },
          clientById.get(String(task.clientId)) || null,
        );
      }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load your posts.' });
  }
});

/** AI-assisted fair rate range for student collaboration (PHP) */
router.post('/suggest-budget', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('accountType role suspended').lean();
    if (!user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (user.suspended) {
      return res.status(403).json({ message: 'Your account is suspended.' });
    }
    if (user.role !== 'user' || user.accountType !== 'client') {
      return res.status(403).json({ message: 'Only client accounts can request rate suggestions.' });
    }

    const title = String(req.body?.title || '').trim().slice(0, 120);
    const description = String(req.body?.description || req.body?.content || '').trim().slice(0, 1200);
    const subjectCategory = String(req.body?.subjectCategory || req.body?.category || '').trim().slice(0, 80);
    const urgency = normalizeUrgency(req.body?.urgency || req.body?.priority);

    if (!title || !description || !subjectCategory) {
      return res.status(400).json({ message: 'Category, title, and description are required for a rate suggestion.' });
    }

    const suggestion = await suggestBudgetWithOpenAI({
      title,
      description,
      subjectCategory,
      urgency,
    });

    res.json(suggestion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not generate a rate suggestion. Please try again.' });
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

    const budgetResult = parseBudget(req.body?.budget ?? req.body?.rate);
    if (!budgetResult.ok) {
      return res.status(400).json({ message: budgetResult.message });
    }

    const task = await Task.create({
      title,
      description,
      subjectCategory,
      urgency,
      clientId: req.user.userId,
      budget: budgetResult.budget,
      category,
      status: 'pending',
      flagged: urgency === 'high',
    });

    const populated = await Task.findById(task._id)
      .populate('clientId', 'name email accountType photoDataUrl')
      .lean();

    const clientName =
      populated?.clientId?.name || user.name || 'A client';
    const taskId = String(task._id);
    const clientId = String(req.user.userId);

    try {
      await Promise.all([
        notifyFreelancersNewTask({ clientId, clientName, taskId }),
        notifyClientPostReview({ clientId }),
      ]);
    } catch (notifyErr) {
      console.error('Notification dispatch failed after task create:', notifyErr);
    }

    res.status(201).json({
      message: 'Your post is under review and waiting for approval.',
      post: mapTaskToFeedPost(populated),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not save your post. Please try again.' });
  }
});

/** Client updates their own post */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post id.' });
    }

    const user = await User.findById(req.user.userId).select('accountType role suspended').lean();
    if (!user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (user.suspended) {
      return res.status(403).json({ message: 'Your account is suspended.' });
    }
    if (user.role !== 'user' || user.accountType !== 'client') {
      return res.status(403).json({ message: 'Only client accounts can update posts.' });
    }

    const task = await Task.findOne({ _id: req.params.id, clientId: req.user.userId });
    if (!task) {
      return res.status(404).json({ message: 'Post not found or you do not have permission to update it.' });
    }

    const title = String(req.body?.title || '').trim().slice(0, 120);
    const description = String(req.body?.description || req.body?.content || '').trim().slice(0, 1200);
    const subjectCategory = String(req.body?.subjectCategory || req.body?.category || '').trim().slice(0, 80);
    const urgency = normalizeUrgency(req.body?.urgency || req.body?.priority);

    if (!title || !description || !subjectCategory) {
      return res.status(400).json({ message: 'Category, title, and description are required.' });
    }

    const budgetProvided = req.body?.budget !== undefined || req.body?.rate !== undefined;
    if (budgetProvided) {
      const budgetResult = parseBudget(req.body?.budget ?? req.body?.rate);
      if (!budgetResult.ok) {
        return res.status(400).json({ message: budgetResult.message });
      }
      task.budget = budgetResult.budget;
    }

    task.title = title;
    task.description = description;
    task.subjectCategory = subjectCategory;
    task.urgency = urgency;
    task.flagged = urgency === 'high';

    await task.save();

    const populated = await Task.findById(task._id)
      .populate('clientId', 'name email accountType photoDataUrl')
      .lean();

    res.json({
      message: 'Post updated successfully.',
      post: mapTaskToFeedPost(populated),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not update your post. Please try again.' });
  }
});

/** Client marks an assigned task as completed */
router.patch('/:id/complete', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post id.' });
    }

    const user = await User.findById(req.user.userId).select('accountType role suspended name').lean();
    if (!user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (user.suspended) {
      return res.status(403).json({ message: 'Your account is suspended.' });
    }
    if (user.role !== 'user' || user.accountType !== 'client') {
      return res.status(403).json({ message: 'Only client accounts can complete tasks.' });
    }

    const task = await Task.findOne({ _id: req.params.id, clientId: req.user.userId });
    if (!task) {
      return res.status(404).json({ message: 'Post not found or you do not have permission.' });
    }
    const hireStatus = task.hireStatus || 'open';
    if (hireStatus !== 'assigned' || !task.assignedFreelancerId) {
      return res.status(400).json({ message: 'This task is not ready to be marked as completed.' });
    }

    task.hireStatus = 'completed';
    task.completedAt = new Date();
    await task.save();

    const populated = await Task.findById(task._id)
      .populate('clientId', 'name email accountType photoDataUrl')
      .populate('assignedFreelancerId', 'name')
      .lean();

    const freelancerId = String(task.assignedFreelancerId);
    const clientName = String(user.name || '').trim() || 'The client';
    try {
      await notifyFreelancerTaskCompleted({
        freelancerId,
        clientId: String(req.user.userId),
        clientName,
        taskId: String(task._id),
        taskTitle: String(task.title || '').trim(),
      });
    } catch (notifyErr) {
      console.error('Notification dispatch failed after task complete:', notifyErr);
    }

    const assigned = populated?.assignedFreelancerId;
    const feedPost = mapTaskToFeedPost({
      ...populated,
      assignedFreelancerName: assigned?.name || undefined,
    });

    res.json({
      message: 'Task marked as completed. You can now rate your freelancer.',
      post: feedPost,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not mark the task as completed.' });
  }
});

/** Client submits a review for the assigned freelancer after completion */
router.patch('/:id/review', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post id.' });
    }

    const user = await User.findById(req.user.userId).select('accountType role suspended name').lean();
    if (!user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (user.suspended) {
      return res.status(403).json({ message: 'Your account is suspended.' });
    }
    if (user.role !== 'user' || user.accountType !== 'client') {
      return res.status(403).json({ message: 'Only client accounts can submit reviews.' });
    }

    const rating = Math.max(1, Math.min(5, Number.parseInt(String(req.body?.rating ?? ''), 10) || 0));
    const reviewText = String(req.body?.text || req.body?.reviewText || '').trim().slice(0, 280);
    if (!rating) {
      return res.status(400).json({ message: 'A rating from 1 to 5 is required.' });
    }
    if (!reviewText) {
      return res.status(400).json({ message: 'Review text is required.' });
    }

    const task = await Task.findOne({ _id: req.params.id, clientId: req.user.userId });
    if (!task) {
      return res.status(404).json({ message: 'Post not found or you do not have permission.' });
    }
    const hireStatus = task.hireStatus || 'open';
    if (hireStatus !== 'completed') {
      return res.status(400).json({ message: 'You can only review after the task is completed.' });
    }
    if (task.reviewSubmittedAt) {
      return res.status(409).json({ message: 'You have already submitted a review for this task.' });
    }
    if (!task.assignedFreelancerId) {
      return res.status(400).json({ message: 'No freelancer is assigned to this task.' });
    }

    const freelancer = await User.findById(task.assignedFreelancerId);
    if (!freelancer) {
      return res.status(404).json({ message: 'Assigned freelancer not found.' });
    }

    const reviewerName = String(user.name || '').trim() || 'Client';
    const profile =
      freelancer.freelancerProfile && typeof freelancer.freelancerProfile === 'object'
        ? { ...freelancer.freelancerProfile }
        : {};
    const reviews = Array.isArray(profile.reviews) ? [...profile.reviews] : [];
    reviews.unshift({
      reviewer: reviewerName,
      text: reviewText,
      rating,
    });
    profile.reviews = reviews.slice(0, 10);
    freelancer.freelancerProfile = profile;
    freelancer.markModified('freelancerProfile');
    await freelancer.save();

    task.reviewRating = rating;
    task.reviewText = reviewText;
    task.reviewSubmittedAt = new Date();
    await task.save();

    const populated = await Task.findById(task._id)
      .populate('clientId', 'name email accountType photoDataUrl')
      .populate('assignedFreelancerId', 'name')
      .lean();

    const assigned = populated?.assignedFreelancerId;
    res.json({
      message: 'Thank you for your review.',
      post: mapTaskToFeedPost({
        ...populated,
        assignedFreelancerName: assigned?.name || undefined,
      }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not submit your review.' });
  }
});

/** Client deletes their own post */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post id.' });
    }

    const user = await User.findById(req.user.userId).select('accountType role suspended').lean();
    if (!user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (user.suspended) {
      return res.status(403).json({ message: 'Your account is suspended.' });
    }
    if (user.role !== 'user' || user.accountType !== 'client') {
      return res.status(403).json({ message: 'Only client accounts can delete posts.' });
    }

    const task = await Task.findOneAndDelete({ _id: req.params.id, clientId: req.user.userId });
    if (!task) {
      return res.status(404).json({ message: 'Post not found or you do not have permission to delete it.' });
    }

    res.json({ message: 'Post deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not delete your post. Please try again.' });
  }
});

module.exports = router;
