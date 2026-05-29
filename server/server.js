const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { loadEnv } = require('./config/env');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const messageRoutes = require('./routes/messages');
const usersRoutes = require('./routes/users');
const tasksRoutes = require('./routes/tasks');
const notificationsRoutes = require('./routes/notifications');
const offersRoutes = require('./routes/offers');
const { attachSocketServer } = require('./socket/socketServer');

// Load environment variables (handles BOM stripping)
loadEnv();

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
  const { isEmailServiceEnabled, hasSmtpConfig, hasResendApiKey } = require('./utils/email.service');
  const smtp = hasSmtpConfig();
  const resend = hasResendApiKey();
  const emailOk = isEmailServiceEnabled();
  res.json({
    ok: true,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    email: emailOk ? (resend ? 'resend_api' : 'smtp') : 'missing_env',
    emailProvider: resend ? 'resend_https' : smtp ? 'nodemailer_smtp' : 'none',
    onRender: process.env.RENDER === 'true' ? 'yes' : 'no',
    corsOrigins: process.env.CORS_ORIGINS ? 'set' : 'missing',
  });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error('Unhandled API error:', err?.message || err);
  res.status(500).json({ message: 'Server error. Please try again.' });
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

attachSocketServer(server, { allowedOrigins });

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
