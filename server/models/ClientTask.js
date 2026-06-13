const { createModel } = require('../db/createModel');
const TABLES = require('../db/tables');

const userPopulate = { getModel: () => require('./User') };

const ClientTask = createModel({
  entity: 'clientTask',
  table: TABLES.CLIENT_TASKS,
  populateMap: {
    clientId: userPopulate,
    assignedFreelancerId: userPopulate,
    approvedBy: userPopulate,
    rejectedBy: userPopulate,
  },
});

/** Replaces MongoDB aggregate: group task counts by clientId. */
ClientTask.aggregateTaskCountByClient = async function aggregateTaskCountByClient() {
  const tasks = await ClientTask.find({}).select('clientId').lean();
  const counts = new Map();
  for (const task of tasks) {
    const id = String(task.clientId || '');
    if (!id) continue;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return [...counts.entries()].map(([_id, count]) => ({ _id, count }));
};

module.exports = ClientTask;
