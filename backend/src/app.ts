import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
// Patches Express to forward async errors to the global error handler
// Without this, unhandled async throws cause silent hangs or process crashes
import 'express-async-errors';

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

// ── Trust proxy — REQUIRED on Render/Heroku/Railway ──────────────
// Without this, req.ip always shows Render's internal IP, not client IP
// Rate limiter would block ALL users as if they were one person
app.set('trust proxy', 1);
// ── Compression (gzip) — 60-70% bandwidth savings on mobile ──────
app.use(compression({
  level: 6,              // balanced speed vs compression ratio
  threshold: 1024,       // only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// ── Security headers ─────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────
const allowedOrigins = config.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
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
// 2mb is plenty — selfie uploads go via multipart, not JSON body
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Logging ───────────────────────────────────────────────────────
// 'tiny' in production: less I/O overhead than 'combined'
app.use(morgan(config.NODE_ENV === 'production' ? 'tiny' : 'dev'));

// ── Global rate limiting ──────────────────────────────────────────
// 500 req/15min per IP supports ~1000+ concurrent active users
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/health',
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
  },
});
app.use('/api/', limiter);

// Stricter limit for auth endpoints — 20 per 15min (registration spikes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many auth attempts. Try again in 15 minutes.' },
  },
});
app.use('/api/auth/', authLimiter);

import { achieversRouter, adminAchieversRouter } from './modules/achievers/routes';
import { dummyProfilesRouter, adminDummyProfilesRouter } from './modules/dummyProfiles/routes';

// ── Root & Health check ───────────────────────────────────────────
app.get('/', (req, res) => {
  if (req.accepts('html')) {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LittleFun V2 — API Server 24/7</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #0d0f17;
            color: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }
          .card {
            background: rgba(26, 29, 45, 0.85);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 40px;
            max-width: 520px;
            width: 100%;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(232, 90, 143, 0.15);
          }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 20px;
            border: 1px solid rgba(16, 185, 129, 0.3);
          }
          .pulse-dot {
            width: 8px;
            height: 8px;
            background: #10b981;
            border-radius: 50%;
            box-shadow: 0 0 10px #10b981;
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.8); }
          }
          h1 {
            font-size: 26px;
            font-weight: 800;
            background: linear-gradient(135deg, #FF6584, #E85A8F, #C8386D);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
          }
          p.sub {
            color: #94a3b8;
            font-size: 14px;
            margin-bottom: 28px;
          }
          .links {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .btn {
            display: block;
            padding: 13px 20px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 14px;
            text-decoration: none;
            transition: all 0.2s ease;
          }
          .btn-primary {
            background: linear-gradient(135deg, #E85A8F, #C8386D);
            color: white;
            box-shadow: 0 4px 14px rgba(232, 90, 143, 0.4);
          }
          .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(232, 90, 143, 0.6);
          }
          .btn-secondary {
            background: rgba(255, 255, 255, 0.05);
            color: #e2e8f0;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
          }
          .footer {
            margin-top: 24px;
            font-size: 12px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">
            <span class="pulse-dot"></span>
            System 24/7 Online (v2.0.0)
          </div>
          <h1>LittleFun V2 API Server</h1>
          <p class="sub">Backend Engine & Realtime Services Connected</p>
          <div class="links">
            <a href="https://littlefunwithpartner.web.app" class="btn btn-primary" target="_blank">Open Customer App 📱</a>
            <a href="https://littlefunwithpartner.web.app/admin" class="btn btn-secondary" target="_blank">Open Admin Portal 🛡️</a>
            <a href="/health" class="btn btn-secondary">Check Health Endpoint 🩺</a>
          </div>
          <div class="footer">
            Powered by Node.js • Supabase PostgreSQL • Firebase Auth
          </div>
        </div>
      </body>
      </html>
    `);
    return;
  }
  res.json({
    name: 'LittleFun V2 API',
    status: 'online',
    version: '2.0.0',
    appUrl: 'https://littlefunwithpartner.web.app',
    adminUrl: 'https://littlefunwithpartner.web.app/admin',
    health: '/health',
  });
});

// ── Health checks ────────────────────────────────────────────────
// /health — fast ping (no DB). Used by UptimeRobot, Render health check.
// Never make this slow — it runs every 30-60 seconds.
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    env: config.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    memory: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    ts: Date.now(),
  });
});

// /health/deep — full DB ping (for manual debugging only, not automated)
app.get('/health/deep', async (_req, res) => {
  let dbStatus = 'ok';
  let dbLatencyMs = -1;
  try {
    const { getSupabaseAdmin } = await import('./services/supabase/supabaseClient');
    const supabase = getSupabaseAdmin();
    const t0 = Date.now();
    const { error } = await supabase.from('users').select('id').limit(1);
    dbLatencyMs = Date.now() - t0;
    if (error) dbStatus = 'degraded';
  } catch {
    dbStatus = 'error';
  }
  res.json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    db: dbStatus,
    dbLatencyMs,
    version: '2.0.0',
    env: config.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    memory: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
  });
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
