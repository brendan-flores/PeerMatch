const mongoose = require('mongoose');

const pendingRegistrationSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  accountType: { type: String, enum: ['client', 'freelancer'] },
  verification: {
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 }, // auto-delete after 24h
});

module.exports = mongoose.model('PendingRegistration', pendingRegistrationSchema);

