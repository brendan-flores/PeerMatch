const AdminActivity = require('../models/AdminActivity');
const User = require('../models/User');

function normalizeActivityBadge(doc) {
  const kind = doc.kind || 'default';
  const raw = String(doc.badge || '').trim().toLowerCase();
  if (kind === 'task_approved' || raw === 'completed') return 'approved';
  if (kind === 'task_rejected' || raw === 'warning') return 'rejected';
  if (raw === 'approved' || raw === 'rejected' || raw === 'pending') return raw;
  return 'pending';
}

function toActivityDto(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    sub: doc.sub || '',
    at: doc.occurredAt ? new Date(doc.occurredAt).toISOString() : new Date().toISOString(),
    badge: normalizeActivityBadge(doc),
    kind: doc.kind || 'default',
    ...(doc.kind === 'task_approved' || doc.kind === 'task_rejected'
      ? {
          clientName: doc.clientName || '',
          moderatorName: doc.moderatorName || '',
          taskTitle: doc.taskTitle || '',
        }
      : {}),
  };
}

async function getAdminDisplayName(adminUserId) {
  if (!adminUserId) return '';
  const user = await User.findById(adminUserId).select('name').lean();
  return String(user?.name || '').trim();
}

async function recordAdminActivity(payload) {
  const doc = await AdminActivity.create(payload);
  return toActivityDto(doc);
}

async function listRecentAdminActivities(limit = 20) {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 20;
  const rows = await AdminActivity.find({ kind: { $ne: 'task_flagged' } })
    .sort({ occurredAt: -1 })
    .limit(safeLimit)
    .lean();
  return rows.map(toActivityDto);
}

async function clearAllAdminActivities() {
  const result = await AdminActivity.deleteMany({});
  return result.deletedCount ?? 0;
}

async function recordTaskSubmitted(task, clientName) {
  const name = String(clientName || '').trim() || 'Unknown client';
  return recordAdminActivity({
    title: 'New task submitted',
    sub: name,
    badge: 'pending',
    kind: 'task_submitted',
    occurredAt: task.createdAt || new Date(),
    clientName: name,
    taskTitle: task.title || '',
    taskId: task._id,
  });
}

async function recordTaskApproved(task, adminUserId) {
  const clientName = task.clientId?.name || 'Unknown client';
  const moderatorName = await getAdminDisplayName(adminUserId);
  return recordAdminActivity({
    title: 'Task Approved',
    sub: task.title || 'Untitled task',
    badge: 'approved',
    kind: 'task_approved',
    occurredAt: task.updatedAt || new Date(),
    clientName,
    moderatorName,
    taskTitle: task.title || '',
    taskId: task._id,
  });
}

async function recordTaskRejected(task, adminUserId) {
  const clientName = task.clientId?.name || 'Unknown client';
  const moderatorName = await getAdminDisplayName(adminUserId);
  return recordAdminActivity({
    title: 'Task Rejected',
    sub: task.title || 'Untitled task',
    badge: 'rejected',
    kind: 'task_rejected',
    occurredAt: task.updatedAt || new Date(),
    clientName,
    moderatorName,
    taskTitle: task.title || '',
    taskId: task._id,
  });
}

module.exports = {
  listRecentAdminActivities,
  clearAllAdminActivities,
  recordTaskSubmitted,
  recordTaskApproved,
  recordTaskRejected,
};
