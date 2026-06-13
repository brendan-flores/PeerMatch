const http = require('http');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { isDbReady, pingDatabase } = require('./db/connect');
const { loadEnv } = require('./config/env');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const messageRoutes = require('./routes/messages');
const usersRoutes = require('./routes/users');
const tasksRoutes = require('./routes/tasks');
const notificationsRoutes = require('./routes/notifications');
const offersRoutes = require('./routes/offers');
const { attachSocketServer } = require('./socket/socketServer');

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

async function requireDb(req, res, next) {
  if (isDbReady() || (await pingDatabase())) {
    return next();
  }
  return res.status(503).json({
    message:
      'Database is unavailable. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then try again.',
  });
}

app.use('/api/auth', requireDb, authRoutes);
app.use('/api/admin', requireDb, adminRoutes);
app.use('/api/messages', requireDb, messageRoutes);
app.use('/api/users', requireDb, usersRoutes);
app.use('/api/tasks', requireDb, tasksRoutes);
app.use('/api/notifications', requireDb, notificationsRoutes);
app.use('/api/offers', requireDb, offersRoutes);

app.get('/', (req, res) => res.send('PeerMatch API is running'));

app.get('/api/health', async (req, res) => {
  const { isSupabaseConfigured } = require('./utils/supabaseClient');
  const supabaseOk = isSupabaseConfigured();
  const dbOk = isDbReady() || (await pingDatabase());
  res.json({
    ok: true,
    database: dbOk ? 'connected' : 'disconnected',
    email: supabaseOk ? 'supabase_otp' : 'missing_env',
    emailProvider: supabaseOk ? 'supabase' : 'none',
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
