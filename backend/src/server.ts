import { app } from './app';
import { config } from './config/env';

const server = app.listen(config.PORT, () => {
  console.log(`\n🚀  LittleFun V2 API`);
  console.log(`    Environment: ${config.NODE_ENV}`);
  console.log(`    Port:        ${config.PORT}`);
  console.log(`    Health:      http://localhost:${config.PORT}/health\n`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌  Port ${config.PORT} is already in use.`);
    console.error(`    Attempting to free port ${config.PORT}...`);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Promise Rejection logged:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception logged:', err);
});

export default server;
