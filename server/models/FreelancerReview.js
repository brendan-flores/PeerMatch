const { createModel } = require('../db/createModel');
const TABLES = require('../db/tables');

const FreelancerReview = createModel({
  entity: 'freelancerReview',
  table: TABLES.FREELANCER_REVIEWS,
});

module.exports = FreelancerReview;
