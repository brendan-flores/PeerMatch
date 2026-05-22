const mongoose = require('mongoose');
const { migrateUsersWithoutUsername } = require('../utils/migrateUsers');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/peer-match';

  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
    await migrateUsersWithoutUsername().catch((err) => {
      console.error('Username migration warning:', err.message);
    });
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
