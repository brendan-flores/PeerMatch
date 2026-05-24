const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

const userSchema = new mongoose.Schema({
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
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  /** Set from public signup when users choose client vs freelancer (role remains `user`). */
  accountType: {
    type: String,
    enum: ['client', 'freelancer'],
  },
  course: { type: String, trim: true },
  yearLevel: { type: String, trim: true },
  aboutMe: { type: String, trim: true },
  skills: { type: String, trim: true },
  location: { type: String, trim: true },
  photoDataUrl: { type: String },
  freelancerProfile: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  profileCompleted: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  verification: { type: verificationSchema },
  /** When true, user cannot use the platform (admin UI shows Suspended). */
  suspended: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

userSchema.index({ role: 1, accountType: 1, suspended: 1 });

module.exports = mongoose.model('User', userSchema);
