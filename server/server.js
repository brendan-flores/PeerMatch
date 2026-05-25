const http = require('http');
const path = require('path');
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

const envPath = path.resolve(__dirname, '..', '.env');
const dotenvResult = dotenv.config({ path: envPath });
if (dotenvResult.error) {
  console.warn(`Failed to load .env from ${envPath}: ${dotenvResult.error.message}`);
} else {
  console.log(`Loaded environment variables from ${envPath}`);
}

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

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ message: 'Invalid request body. Please try again.' });
  }
  return next(err);
});

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

/** Quick deploy check — open /api/health on your Render URL (no secrets returned). */
app.get('/api/health', (req, res) => {
  const supabaseEmail = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const smtpEmail = Boolean(
    process.env.EMAIL_HOST &&
      process.env.EMAIL_PORT &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS,
  );
  res.json({
    ok: true,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    email: supabaseEmail ? 'supabase_edge_function' : smtpEmail ? 'smtp' : 'missing_env',
    emailProvider: supabaseEmail ? 'supabase+resend' : smtpEmail ? 'smtp' : 'none',
    supabaseUrl: process.env.SUPABASE_URL ? 'set' : 'missing',
    emailHost: process.env.EMAIL_HOST ? 'set' : 'missing',
    corsOrigins: process.env.CORS_ORIGINS ? 'set' : 'missing',
  });
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

attachSocketServer(server, { allowedOrigins });

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
