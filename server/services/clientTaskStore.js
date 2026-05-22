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
    .select('name email')
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
    flagged: !!task.flagged,
    clientName: client?.name || 'Unknown',
    budget: task.budget,
    category: task.category,
    status: task.status || 'pending',
  };
}

async function listClientTasksForAdmin() {
  const tasks = await ClientTask.find().sort({ createdAt: -1 }).lean();
  const clientById = await loadClientsForTasks(tasks);
  const pendingTotal = await ClientTask.countDocuments({
    $or: [{ status: 'pending' }, { status: { $exists: false } }, { status: null }],
  });

  return {
    tasks: tasks.map((task) => mapTaskToAdminRow(task, clientById)),
    pendingTotal,
  };
}

module.exports = {
  listClientTasksForAdmin,
  mapTaskToAdminRow,
  loadClientsForTasks,
};
