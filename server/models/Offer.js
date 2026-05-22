const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    postTitle: { type: String, required: true, trim: true, maxlength: 120 },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    freelancerName: { type: String, required: true, trim: true, maxlength: 120 },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rate: { type: String, default: '', trim: true, maxlength: 40 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

offerSchema.index({ postId: 1, freelancerId: 1 });

module.exports = mongoose.model('Offer', offerSchema);
