const { createModel } = require('../db/createModel');
const TABLES = require('../db/tables');

const userPopulate = { getModel: () => require('./User') };

const Offer = createModel({
  entity: 'offer',
  table: TABLES.OFFERS,
  populateMap: {
    freelancerId: userPopulate,
  },
});

module.exports = Offer;
