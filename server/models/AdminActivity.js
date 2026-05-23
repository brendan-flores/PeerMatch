const mongoose = require('mongoose');

const adminActivitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    sub: { type: String, trim: true, default: '' },
    badge: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'warning'],
      required: true,
    },
    kind: {
      type: String,
      enum: ['default', 'task_approved', 'task_rejected', 'task_submitted', 'task_flagged'],
      default: 'default',
    },
    occurredAt: { type: Date, default: Date.now, index: true },
    clientName: { type: String, trim: true, default: '' },
    moderatorName: { type: String, trim: true, default: '' },
    taskTitle: { type: String, trim: true, default: '' },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('AdminActivity', adminActivitySchema);
