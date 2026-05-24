const mongoose = require('mongoose');
const { dropObsoleteCollections } = require('../utils/dropObsoleteCollections');
const { migrateUsersWithoutUsername } = require('../utils/migrateUsers');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/peer-match';

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      retryReads: true,
    });
    console.log('MongoDB connected');
    const dropped = await dropObsoleteCollections(mongoose.connection.db);
    if (dropped.length > 0) {
      console.log(`Dropped obsolete collections: ${dropped.join(', ')}`);
    }
    await migrateUsersWithoutUsername().catch((err) => {
      console.error('Username migration warning:', err.message);
    });
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
