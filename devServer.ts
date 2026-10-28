import path from 'path';
import { createServer as createViteServer } from 'vite';
import { pool } from './src/db/pg.js';
import { createApp, flushPendingWrites } from './src/createApp.js';

const parsedPort = Number.parseInt(process.env.PORT || '3000', 10);
const PORT = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000;

async function startServer() {
  const app = await createApp();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use((await import('express')).default.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`EOM Server running on port ${PORT} [Mode: ${process.env.NODE_ENV || 'development'}]`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\\nReceived ${signal}. Initiating EOM server graceful shutdown...`);
    server.close(async () => {
      console.log('HTTP server closed.');
      try {
        await flushPendingWrites();
      } catch (err: any) {
        console.error('Failed to flush pending PostgreSQL writes:', err?.message || err);
      }
      if (pool) {
        await pool.end();
        console.log('PostgreSQL connection pool closed successfully.');
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

startServer().catch((err: any) => {
  console.error('EOM startup failed:', err?.message || err);
  process.exitCode = 1;
});
