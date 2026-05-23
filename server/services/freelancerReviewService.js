const FreelancerReview = require('../models/FreelancerReview');

const DEFAULT_LIMIT = 10;

function mapReviewDoc(doc) {
  return {
    reviewer: String(doc.reviewerName || '').trim() || 'Client',
    text: String(doc.text || '').trim(),
    rating: Math.max(1, Math.min(5, Number(doc.rating) || 5)),
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
  };
}

async function listFreelancerReviews(freelancerId, limit = DEFAULT_LIMIT) {
  const docs = await FreelancerReview.find({ freelancerId })
    .sort({ createdAt: -1 })
    .limit(Math.max(1, Math.min(limit, 50)))
    .lean();

  return docs.map(mapReviewDoc);
}

async function createFreelancerReview(input) {
  const doc = await FreelancerReview.create({
    freelancerId: input.freelancerId,
    clientId: input.clientId,
    taskId: input.taskId,
    reviewerName: input.reviewerName,
    text: input.text,
    rating: input.rating,
  });
  return doc;
}

async function hasReviewForTask(taskId) {
  const existing = await FreelancerReview.findOne({ taskId }).select('_id').lean();
  return Boolean(existing);
}

module.exports = {
  listFreelancerReviews,
  createFreelancerReview,
  hasReviewForTask,
  mapReviewDoc,
};
