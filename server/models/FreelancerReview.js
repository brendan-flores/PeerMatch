const mongoose = require('mongoose');

const freelancerReviewSchema = new mongoose.Schema(
  {
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientTask',
      required: true,
      unique: true,
    },
    reviewerName: { type: String, required: true, trim: true, maxlength: 60 },
    text: { type: String, required: true, trim: true, maxlength: 280 },
    rating: { type: Number, required: true, min: 1, max: 5 },
  },
  { timestamps: true },
);

module.exports = mongoose.model('FreelancerReview', freelancerReviewSchema, 'freelancerReviews');
