const { createModel } = require('../db/createModel');
const TABLES = require('../db/tables');

const Notification = createModel({
  entity: 'notification',
  table: TABLES.NOTIFICATIONS,
});

module.exports = Notification;
