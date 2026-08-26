import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from './config/env';
import { initFirebase } from './services/firebase/firebaseAdmin';
import { errorHandler } from './middleware/errorHandler';

// Route modules
import { usersRouter } from './modules/users/routes';
import { profilesRouter } from './modules/profiles/routes';
import { discoveryRouter } from './modules/discovery/routes';
import { requirementsRouter } from './modules/requirements/routes';
import { matchesRouter } from './modules/matches/routes';
import { chatRouter } from './modules/chat/routes';
import { requestsRouter } from './modules/requests/routes';
import { notificationsRouter } from './modules/notifications/routes';
import { paymentsRouter } from './modules/payments/routes';
import { moderationRouter } from './modules/moderation/routes';
import { adminRouter } from './modules/admin/routes';
import { authRouter } from './modules/auth/routes';

// Initialize Firebase Admin SDK
initFirebase();

const app = express();

// ── Security headers ─────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────
const allowedOrigins = config.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, curl, etc.) or any localhost port or configured origins
      if (!origin || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        cb(null, true);
      } else {
        cb(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

// ── Request parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ───────────────────────────────────────────────────────
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Global rate limiting ──────────────────────────────────────────
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
  },
});
app.use('/api/', limiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many auth attempts. Try again in 15 minutes.' },
  },
});
app.use('/api/auth/', authLimiter);

import { achieversRouter, adminAchieversRouter } from './modules/achievers/routes';
import { dummyProfilesRouter, adminDummyProfilesRouter } from './modules/dummyProfiles/routes';

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0', env: config.NODE_ENV });
});

// ── API Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/discovery', discoveryRouter);
app.use('/api/requirements', requirementsRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/conversations', chatRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/reports', moderationRouter);
app.use('/api/achievers', achieversRouter);
app.use('/api/admin/achievers', adminAchieversRouter);
app.use('/api/dummy-profiles', dummyProfilesRouter);
app.use('/api/admin/dummy-profiles', adminDummyProfilesRouter);
app.use('/api/admin', adminRouter);

// ── 404 handler ───────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist.' },
  });
});

// ── Global error handler (must be last) ──────────────────────────
app.use(errorHandler);

export { app };
