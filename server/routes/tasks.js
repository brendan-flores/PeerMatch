const express = require('express');
const mongoose = require('mongoose');
const ClientTask = require('../models/ClientTask');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { mapTaskToFeedPost, normalizeUrgency } = require('../utils/taskFeedDto');
const {
  parseFeedFiltersFromQuery,
  applyFeedFiltersToQuery,
} = require('../utils/postFeedFilters');
const { parseBudget } = require('../utils/budgetValidation');
const { suggestBudgetWithOpenAI } = require('../services/suggestBudget');
const {
  notifyFreelancersNewTask,
  notifyClientPostReview,
  notifyFreelancerTaskCompleted,
} = require('../services/notificationService');
const { recordTaskSubmitted } = require('../services/adminActivityService');
const {
  createFreelancerReview,
  hasReviewForTask,
} = require('../services/freelancerReviewService');

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
    // ✅ KEEP FILTERING (from dev)
    const filters = parseFeedFiltersFromQuery(req.query);

    const taskQuery = applyFeedFiltersToQuery(
      {
        status: 'approved',
        $or: [
          { hireStatus: { $in: ['open', null] } },
          { hireStatus: { $exists: false } },
        ],
      },
      filters,
    );

    // ✅ FIX: use ClientTask (not Task)
    const tasks = await ClientTask.find(taskQuery)
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

    const tasks = await ClientTask.find({ clientId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const clientById = await loadClientsForTasks(tasks);

    const freelancerIds = [
      ...new Set(
        tasks
          .map((task) =>
            task.assignedFreelancerId
              ? String(task.assignedFreelancerId)
              : '',
          )
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id)),
      ),
    ];

    const freelancers =
      freelancerIds.length > 0
        ? await User.find({ _id: { $in: freelancerIds } })
            .select('name')
            .lean()
        : [];

    const freelancerById = new Map(
      freelancers.map((f) => [String(f._id), f]),
    );

    res.json({
      posts: tasks.map((task) => {
        const assigned = freelancerById.get(
          String(task.assignedFreelancerId || ''),
        );

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