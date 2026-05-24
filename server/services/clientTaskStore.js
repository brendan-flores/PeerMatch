const mongoose = require('mongoose');
const ClientTask = require('../models/ClientTask');
const User = require('../models/User');

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
    .select('name email accountType course yearLevel')
    .lean();

  return new Map(clients.map((client) => [String(client._id), client]));
}

function mapTaskToAdminRow(task, clientById) {
  const clientId = task.clientId ? String(task.clientId._id || task.clientId) : '';
  const client = clientById.get(clientId);

  return {
    id: String(task._id),
    title: task.title,
    description: task.description || '',
    subjectCategory: task.subjectCategory || '',
    urgency: task.urgency || 'normal',
    createdAt: task.createdAt ? new Date(task.createdAt).toISOString() : null,
    updatedAt: task.updatedAt ? new Date(task.updatedAt).toISOString() : null,
    clientId,
    clientName: client?.name || task.clientId?.name || 'Unknown',
    clientEmail: client?.email || '',
    clientAccountType: client?.accountType || null,
    clientCourse: client?.course || '',
    clientYearLevel: client?.yearLevel || '',
    budget: task.budget,
    category: task.category,
    status: task.status || 'pending',
    hireStatus: task.hireStatus || 'open',
  };
}

async function getClientTaskByIdForAdmin(taskId) {
  if (!mongoose.Types.ObjectId.isValid(taskId)) return null;

  const task = await ClientTask.findById(taskId)
    .populate('clientId', 'name email accountType course yearLevel')
    .populate('assignedFreelancerId', 'name email')
    .populate('approvedBy', 'name')
    .populate('rejectedBy', 'name')
    .lean();

  if (!task) return null;

  const clientById = await loadClientsForTasks([task]);
  const row = mapTaskToAdminRow(task, clientById);
  const freelancer = task.assignedFreelancerId;
  const client = task.clientId;

  return {
    ...row,
    clientEmail: client?.email || row.clientEmail || '',
    clientAccountType: client?.accountType || row.clientAccountType || null,
    clientCourse: client?.course || row.clientCourse || '',
    clientYearLevel: client?.yearLevel || row.clientYearLevel || '',
    assignedFreelancerName:
      freelancer && typeof freelancer === 'object' ? freelancer.name || '' : '',
    assignedFreelancerEmail:
      freelancer && typeof freelancer === 'object' ? freelancer.email || '' : '',
    approvedByName: task.approvedBy?.name || '',
    rejectedByName: task.rejectedBy?.name || '',
    completedAt: task.completedAt ? new Date(task.completedAt).toISOString() : null,
    reviewSubmittedAt: task.reviewSubmittedAt
      ? new Date(task.reviewSubmittedAt).toISOString()
      : null,
    reviewRating: task.reviewRating ?? null,
  };
}

async function listClientTasksForAdmin() {
  const pendingFilter = {
    $or: [{ status: 'pending' }, { status: { $exists: false } }, { status: null }],
  };

  const [tasks, pendingTotal] = await Promise.all([
    ClientTask.find()
      .populate('clientId', 'name')
      .sort({ createdAt: -1 })
      .limit(200)
      .select(
        'title description status hireStatus clientId budget category urgency createdAt updatedAt assignedFreelancerId',
      )
      .lean(),
    ClientTask.countDocuments(pendingFilter),
  ]);

  const clientById = await loadClientsForTasks(tasks);

  return {
    tasks: tasks.map((task) => mapTaskToAdminRow(task, clientById)),
    pendingTotal,
  };
}

module.exports = {
  listClientTasksForAdmin,
  getClientTaskByIdForAdmin,
  mapTaskToAdminRow,
  loadClientsForTasks,
};
