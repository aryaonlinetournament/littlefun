import { app } from './app';
import { config } from './config/env';

const server = app.listen(config.PORT, () => {
  console.log(`\n🚀  LittleFun V2 API`);
  console.log(`    Environment: ${config.NODE_ENV}`);
  console.log(`    Port:        ${config.PORT}`);
  console.log(`    Health:      http://localhost:${config.PORT}/health\n`);
});

// ── Production HTTP tuning ────────────────────────────────────────
// keepAliveTimeout > load balancer idle timeout prevents 502s
// Render/AWS ALB default idle timeout is 60s — we set 65s
server.keepAliveTimeout = 65_000;
// headersTimeout must be > keepAliveTimeout
server.headersTimeout = 70_000;
// Max number of queued socket connections
server.maxConnections = 5_000;

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌  Port ${config.PORT} is already in use.`);
    console.error(`    Attempting to free port ${config.PORT}...`);
    process.exit(1);
  }
});

// Graceful shutdown — allows in-flight requests to complete
const gracefulShutdown = (signal: string) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('Server closed. All connections drained.');
    process.exit(0);
  });
  // Force exit after 30s if connections don't drain
  setTimeout(() => {
    console.error('Forced exit after 30s timeout.');
    process.exit(1);
  }, 30_000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Promise Rejection logged:', reason);
  // Do NOT exit — log and continue to avoid crashing active users
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception logged:', err);
  // Do NOT exit for known non-fatal errors
  // Only exit for truly unrecoverable situations
});

export default server;
