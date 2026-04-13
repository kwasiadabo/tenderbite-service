require('dotenv').config();

const app               = require('./app');
const { initDatabase }  = require('./config/database');

const PORT = parseInt(process.env.PORT) || 3000;

const start = async () => {
  try {
    await initDatabase();

    const server = app.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
      console.log(`[Server] Swagger docs at http://localhost:${PORT}/api-docs`);
      console.log(`[Server] Health check  at http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n[Server] ${signal} received – shutting down gracefully`);
      server.close(() => {
        console.log('[Server] HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
};

start();