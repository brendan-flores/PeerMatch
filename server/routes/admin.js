const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
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
      approvedTasks,
      activeUsers,
      totalUsers,
      verifiedUsers,
      suspendedUsers,
      flaggedPending,
    ] = await Promise.all([
      Task.countDocuments(),
      Task.countDocuments({ status: 'pending' }),
      Task.countDocuments({ status: 'approved' }),
      User.countDocuments({ role: 'user', suspended: { $ne: true } }),
      // Exclude admin accounts from these student/user aggregates.
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', verified: true }),
      User.countDocuments({ role: 'user', suspended: true }),
      Task.countDocuments({ flagged: true, status: 'pending' }),
    ]);

    const verificationRate =
      totalUsers === 0 ? 0 : Math.round((verifiedUsers / totalUsers) * 1000) / 10;

    res.json({
      totalTasks,
      pendingReview,
      completedTasks: approvedTasks,
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
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();

    const taskCounts = await Task.aggregate([
      { $group: { _id: '$clientId', count: { $sum: 1 } } },
    ]);
    const countByClient = new Map(taskCounts.map((x) => [String(x._id), x.count]));

    const payload = users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      joinedAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
      accountType: u.accountType || null,
      role: u.role,
      verified: !!u.verified,
      suspended: !!u.suspended,
      tasksPosted: countByClient.get(String(u._id)) || 0,
      rating: u.accountType === 'freelancer' ? null : undefined,
    }));

    res.json({ users: payload });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load users.' });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    const [tasks, pendingTotal] = await Promise.all([
      Task.find().populate('clientId', 'name email').sort({ createdAt: -1 }).lean(),
      Task.countDocuments({ status: 'pending' }),
    ]);

    const payload = tasks.map((t) => ({
      id: String(t._id),
      title: t.title,
      description: t.description || '',
      subjectCategory: t.subjectCategory || '',
      urgency: t.urgency || 'normal',
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
      updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : null,
      flagged: !!t.flagged,
      clientName: t.clientId?.name || 'Unknown',
      budget: t.budget,
      category: t.category,
      status: t.status,
    }));

    res.json({ tasks: payload, pendingTotal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load tasks.' });
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

    const task = await Task.findByIdAndUpdate(req.params.id, update, { new: true })
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
