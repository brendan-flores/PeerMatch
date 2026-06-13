const { createModel } = require('../db/createModel');
const TABLES = require('../db/tables');

const AdminActivity = createModel({
  entity: 'adminActivity',
  table: TABLES.ADMIN_ACTIVITIES,
});

module.exports = AdminActivity;
