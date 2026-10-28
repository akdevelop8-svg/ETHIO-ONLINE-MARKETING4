import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import bodyParser from 'body-parser';
import { pool } from './src/db/pg.js';
import { PostgresPersistenceAdapter } from './src/services/persistence/postgresAdapter.js';
import { setStorageAdapter } from './src/services/persistence/index.js';
import { runMigrations } from './src/db/migrations.js';
import {
  securityHeadersMiddleware,
  correlationIdMiddleware,
  errorHandlerMiddleware
} from './src/middleware/securityMiddleware.js';
import { generalApiRateLimiter } from './src/middleware/rateLimiter.js';

const parsedPort = Number.parseInt(process.env.PORT || '3000', 10);
const PORT = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000;

async function startServer() {
  const requirePostgres = process.env.NODE_ENV === 'production' && process.env.REQUIRE_POSTGRES === 'true';

  // Refuse to launch a production instance that would silently lose data on restart.
  if (requirePostgres && !pool) {
    throw new Error('DATABASE_URL is missing or invalid while REQUIRE_POSTGRES=true. Configure the Supabase PostgreSQL connection URI.');
  }

  if (pool) {
    await runMigrations();
  }

  const adapter = new PostgresPersistenceAdapter();
  await adapter.loadAllFromDatabase();
  setStorageAdapter(adapter);

  // Import domain routers only after the persistence adapter is ready.
  const [
    { authRouter },
    { adminRouter },
    { transactionsRouter },
    { listingsRouter },
    { ordersRouter },
    { disputesRouter },
    { webhooksRouter },
    { aiRouter },
    { communityRouter },
    { notificationsRouter },
    { sellerRouter }
  ] = await Promise.all([
    import('./src/api/auth.js'),
    import('./src/api/admin.js'),
    import('./src/api/transactions.js'),
    import('./src/api/listings.js'),
    import('./src/api/orders.js'),
    import('./src/api/disputes.js'),
    import('./src/api/webhooks.js'),
    import('./src/api/ai.js'),
    import('./src/api/community.js'),
    import('./src/api/notifications.js'),
    import('./src/api/seller.js')
  ]);

  const app = express();

  // When CORS_ORIGIN is set, it may contain a comma-separated allowlist.
  // If unset, reflect request origins rather than combining wildcard + credentials.
  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.length === 0 ||
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, origin);
      }
      return callback(new Error('Origin is not allowed by the EOM CORS configuration.'));
    },
    credentials: true
  }));

  app.use(securityHeadersMiddleware);
  app.use(correlationIdMiddleware);

  app.use(express.json({ limit: '12mb' }));
  app.use(express.urlencoded({ extended: true, limit: '12mb' }));
  app.use(bodyParser.json({ limit: '12mb' }));

  app.use('/api', generalApiRateLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/health/db', async (_req, res) => {
    try {
      if (pool) {
        const result = await pool.query('SELECT NOW() as db_time');
        return res.json({
          status: 'connected',
          dbTime: result.rows[0].db_time,
          poolActive: true
        });
      }

      if (requirePostgres) {
        return res.status(503).json({
          status: 'unhealthy',
          error: 'Database connection pool unavailable in production mode'
        });
      }

      return res.json({ status: 'simulated', poolActive: false });
    } catch (err: any) {
      console.error('Database health check failed:', err?.message || err);
      return res.status(503).json({
        status: 'unhealthy',
        error: 'Database query failed'
      });
    }
  });

  // Backward-compatible health alias.
  app.get('/api/db-status', async (_req, res) => {
    try {
      if (pool) {
        const result = await pool.query('SELECT NOW()');
        return res.json({ status: 'connected', time: result.rows[0].now });
      }
      if (requirePostgres) {
        return res.status(503).json({ status: 'unhealthy', error: 'Database is required but not configured.' });
      }
      return res.json({ status: 'simulated' });
    } catch (err: any) {
      console.error('Database status check failed:', err?.message || err);
      return res.status(503).json({ status: 'error', error: 'Database query failed' });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/transactions', transactionsRouter);
  app.use('/api/listings', listingsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/disputes', disputesRouter);
  app.use('/api/webhooks', webhooksRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/community', communityRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/seller', sellerRouter);

  // Unknown API paths should return a JSON 404, never the SPA index.html.
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'EOM API endpoint not found. Check the API route and backend deployment.' });
  });

  app.use(errorHandlerMiddleware);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`EOM Server running on port ${PORT} [Mode: ${process.env.NODE_ENV || 'development'}]`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Initiating EOM server graceful shutdown...`);
    server.close(async () => {
      console.log('HTTP server closed.');
      try {
        await adapter.flushPendingWrites();
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
