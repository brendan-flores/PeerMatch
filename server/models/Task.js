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
    flagged: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Task', taskSchema);
