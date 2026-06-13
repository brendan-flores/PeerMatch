const { createModel } = require('../db/createModel');
const TABLES = require('../db/tables');

const User = createModel({
  entity: 'user',
  table: TABLES.USERS,
});

module.exports = User;
