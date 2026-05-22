const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const authController = require('../controllers/authController');
const { mapTaskToFeedPost } = require('../utils/taskFeedDto');
const { emitToUser } = require('../socket/socketServer');

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

async function buildRecentActivities(limit = 20) {
  const [tasks, newUsers] = await Promise.all([
    Task.find()
      .populate('clientId', 'name')
      .populate('approvedBy', 'name')
      .sort({ updatedAt: -1 })
      .limit(30)
      .lean(),
    User.find({ role: 'user', verified: { $ne: true } })
      .select('name createdAt verified')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
  ]);

  const fromTasks = tasks.map((t) => {
    const clientName = t.clientId?.name || 'Unknown client';
    let title;
    let badge;
    let sub;
    let kind = 'default';
    let approvedByName;
    let taskTitle;

    if (t.status === 'pending') {
      if (t.flagged) {
        title = 'Task flagged for review';
        badge = 'warning';
      } else {
        title = 'New task submitted';
        badge = 'pending';
      }
      sub = clientName;
    } else if (t.status === 'approved') {
      title = 'Task Approved';
      badge = 'completed';
      kind = 'task_approved';
      taskTitle = t.title || 'Untitled task';
      sub = taskTitle;
      approvedByName = t.approvedBy?.name || 'Admin';
    } else {
      title = 'Task rejected';
      badge = 'warning';
      sub = clientName;
    }

    const at = t.status === 'pending' ? t.createdAt : t.updatedAt;
    return {
      id: `task-${t._id}`,
      title,
      sub,
      at: new Date(at).toISOString(),
      badge,
      kind,
      ...(kind === 'task_approved'
        ? {
            clientName,
            approvedByName,
            taskTitle,
          }
        : {}),
    };
  });

  const fromUsers = newUsers.map((u) => ({
    id: `user-${u._id}`,
    title: 'New user registered',
    sub: u.name,
    at: new Date(u.createdAt).toISOString(),
    badge: 'pending',
    kind: 'default',
  }));

  return [...fromTasks, ...fromUsers]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit);
}

router.get('/activities', async (req, res) => {
  try {
    const rawLimit = parseInt(String(req.query.limit || '20'), 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 20;
    const items = await buildRecentActivities(limit);
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
      rating: null,
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
    const update =
      status === 'approved'
        ? { $set: { status, approvedBy: req.user.userId } }
        : { $set: { status }, $unset: { approvedBy: '' } };

    const task = await Task.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('clientId', 'name email accountType photoDataUrl')
      .populate('approvedBy', 'name')
      .lean();
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (status === 'approved' && task.clientId) {
      const clientId = task.clientId._id ? String(task.clientId._id) : String(task.clientId);
      emitToUser(clientId, 'post_approved', {
        message: 'Your post has been approved.',
        post: mapTaskToFeedPost(task),
      });
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
