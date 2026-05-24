const http = require('http');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const messageRoutes = require('./routes/messages');
const usersRoutes = require('./routes/users');
const tasksRoutes = require('./routes/tasks');
const notificationsRoutes = require('./routes/notifications');
const offersRoutes = require('./routes/offers');
const { attachSocketServer } = require('./socket/socketServer');
const path = require('path');
const fs = require('fs');

// Load .env from root directory
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
console.log('.env file exists:', fs.existsSync(envPath));

dotenv.config({ path: envPath });

// Debug: Check if environment variables are loaded
console.log('Environment variables loaded:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'NOT SET');

const rawOrigins =
  process.env.CORS_ORIGINS || 'http://localhost:3000';
const allowedOrigins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);

const app = express();
if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));

connectDB();

function requireDb(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message:
        'Database is unavailable. Start MongoDB or set MONGODB_URI, then try again.',
    });
  }
  next();
}

app.use('/api/auth', requireDb, authRoutes);
app.use('/api/admin', requireDb, adminRoutes);
app.use('/api/messages', requireDb, messageRoutes);
app.use('/api/users', requireDb, usersRoutes);
app.use('/api/tasks', requireDb, tasksRoutes);
app.use('/api/notifications', requireDb, notificationsRoutes);
app.use('/api/offers', requireDb, offersRoutes);

app.get('/', (req, res) => res.send('PeerMatch MERN API is running'));

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

attachSocketServer(server, { allowedOrigins });

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
