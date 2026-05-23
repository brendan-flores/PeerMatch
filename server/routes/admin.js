const express = require('express');
const mongoose = require('mongoose');
const ClientTask = require('../models/ClientTask');
const User = require('../models/User');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const authController = require('../controllers/authController');
const { mapTaskToFeedPost } = require('../utils/taskFeedDto');
const { emitToUser } = require('../socket/socketServer');
const { notifyClientPostApproved } = require('../services/notificationService');
const {
  listRecentAdminActivities,
  recordTaskApproved,
  recordTaskRejected,
} = require('../services/adminActivityService');
const { getClientTaskByIdForAdmin, listClientTasksForAdmin } = require('../services/clientTaskStore');

const router = express.Router();

// Authentication is separated for admin routes so the admin UI cannot
// reuse the main app's login cookie automatically.
router.use((req, res, next) => {
  if (req.path.startsWith('/auth/')) return next();
  return authMiddleware(req, res, () => requireAdmin(req, res, next));
});

// Admin-only auth (uses the admin JWT cookie).
router.post('/auth/login', (req, res) => void authController.login(req, res));
router.post('/auth/logout', (req, res) => void authController.logout(req, res));
router.get('/auth/me', authMiddleware, (req, res) => void authController.getMe(req, res));

router.get('/dashboard', (req, res) => {
  res.json({
    ok: true,
    area: 'admin',
    message: 'Dashboard data (admin only).',
    userId: req.user.userId,
    role: req.user.role,
  });
});

router.get('/overview', (req, res) => {
  res.json({
    message: 'Admin-only overview (enforced server-side).',
    actor: { userId: req.user.userId, role: req.user.role },
  });
});

router.get('/users/count', async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ userCount: count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load user count.' });
  }
});

/** Dashboard metrics + user management summary */
router.get('/stats', async (req, res) => {
  try {
    const [
      totalTasks,
      pendingReview,
      completedTasks,
      activeUsers,
      totalUsers,
      verifiedUsers,
      suspendedUsers,
      flaggedPending,
    ] = await Promise.all([
      ClientTask.countDocuments({ status: 'approved' }),
      ClientTask.countDocuments({
        $or: [{ status: 'pending' }, { status: { $exists: false } }, { status: null }],
      }),
      ClientTask.countDocuments({
        status: 'approved',
        hireStatus: 'completed',
        reviewSubmittedAt: { $ne: null },
      }),
      User.countDocuments({ role: 'user', suspended: { $ne: true } }),
      // Exclude admin accounts from these student/user aggregates.
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', verified: true }),
      User.countDocuments({ role: 'user', suspended: true }),
      ClientTask.countDocuments({ flagged: true, status: 'pending' }),
    ]);

    const verificationRate =
      totalUsers === 0 ? 0 : Math.round((verifiedUsers / totalUsers) * 1000) / 10;

    res.json({
      totalTasks,
      pendingReview,
      completedTasks,
      activeUsers,
      totalUsers,
      verifiedUsers,
      suspendedUsers,
      flaggedPending,
      verificationRate,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load admin stats.' });
  }
});

router.get('/activities', async (req, res) => {
  try {
    const rawLimit = parseInt(String(req.query.limit || '20'), 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 20;
    const items = await listRecentAdminActivities(limit);
    res.json({ items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load activities.' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('name email role accountType verified suspended createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const taskCounts = await ClientTask.aggregate([
      { $group: { _id: '$clientId', count: { $sum: 1 } } },
    ]);
    const countByClient = new Map(taskCounts.map((x) => [String(x._id), x.count]));

    const payload = users.map((u) => ({
      id: String(u._id),
      name: String(u.name || '').trim() || 'Unknown',
      email: String(u.email || '').trim(),
      joinedAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
      accountType: u.accountType || null,
      role: u.role,
      verified: !!u.verified,
      suspended: !!u.suspended,
      tasksPosted: countByClient.get(String(u._id)) || 0,
    }));

    res.json({ users: payload });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load users.' });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    const { tasks, pendingTotal } = await listClientTasksForAdmin();
    res.json({ tasks, pendingTotal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load tasks.' });
  }
});

router.get('/tasks/:id', async (req, res) => {
  try {
    const task = await getClientTaskByIdForAdmin(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }
    res.json({ task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load task details.' });
  }
});

router.patch('/tasks/:id', async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid task id.' });
    }
    const adminId = req.user.userId;
    let update;
    if (status === 'approved') {
      update = { $set: { status, approvedBy: adminId }, $unset: { rejectedBy: '' } };
    } else if (status === 'rejected') {
      update = { $set: { status, rejectedBy: adminId }, $unset: { approvedBy: '' } };
    } else {
      update = { $set: { status }, $unset: { approvedBy: '', rejectedBy: '' } };
    }

    const task = await ClientTask.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('clientId', 'name email accountType photoDataUrl')
      .populate('approvedBy', 'name')
      .populate('rejectedBy', 'name')
      .lean();
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (status === 'approved' && task.clientId) {
      const clientId = task.clientId._id ? String(task.clientId._id) : String(task.clientId);
      const taskId = String(task._id);
      emitToUser(clientId, 'post_approved', {
        message: 'Your post has been approved.',
        post: mapTaskToFeedPost(task),
      });
      try {
        await notifyClientPostApproved({ clientId, taskId });
      } catch (notifyErr) {
        console.error('Notification dispatch failed after post approval:', notifyErr);
      }
    }

    try {
      if (status === 'approved') {
        await recordTaskApproved(task, adminId);
      } else if (status === 'rejected') {
        await recordTaskRejected(task, adminId);
      }
    } catch (activityErr) {
      console.error('Failed to record admin activity:', activityErr);
    }

    res.json({
      task: {
        id: String(task._id),
        title: task.title,
        createdAt: task.createdAt ? new Date(task.createdAt).toISOString() : null,
        updatedAt: task.updatedAt ? new Date(task.updatedAt).toISOString() : null,
        flagged: !!task.flagged,
        clientName: task.clientId?.name || 'Unknown',
        budget: task.budget,
        category: task.category,
        status: task.status,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not update task.' });
  }
});

router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body || {};
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { $set: { role } }, { new: true })
      .select('-password')
      .lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not update user role.' });
  }
});

module.exports = router;
