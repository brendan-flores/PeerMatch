const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    subjectCategory: { type: String, trim: true, default: '' },
    urgency: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal',
    },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    budget: { type: Number, required: true, min: 0, default: 0 },
    category: { type: String, enum: ['academic', 'non-academic'], required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    hireStatus: {
      type: String,
      enum: ['open', 'assigned', 'completed'],
      default: 'open',
      index: true,
    },
    assignedFreelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    completedAt: { type: Date, default: null },
    reviewRating: { type: Number, min: 1, max: 5, default: null },
    reviewText: { type: String, trim: true, maxlength: 280, default: '' },
    reviewSubmittedAt: { type: Date, default: null },
    flagged: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Task', taskSchema);
