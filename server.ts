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

const PORT = process.env.PORT || 3000;

async function startServer() {
  // Run Database Migrations before anything else
  if (pool) {
    await runMigrations();
  }

  // Initialize Postgres cache if on server (sync-ish loading on boot)
  const adapter = new PostgresPersistenceAdapter();
  await adapter.loadAllFromDatabase();
  setStorageAdapter(adapter);

  // IMPORTANT: import domain routers only after the persistence adapter is ready.
  // Their singleton services capture repository instances at module initialization.
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

  // CORS Security Configuration
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : '*';

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true
    })
  );

  // Security Headers & Request Correlation IDs
  app.use(securityHeadersMiddleware);
  app.use(correlationIdMiddleware);

  // Request Payload Limits
  app.use(express.json({ limit: '12mb' }));
  app.use(express.urlencoded({ extended: true, limit: '12mb' }));
  app.use(bodyParser.json({ limit: '12mb' }));

  // Global Rate Limiting for API routes
  app.use('/api', generalApiRateLimiter);

  // 1. API Health & Status Monitoring
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  });

  // DB Health check
  app.get('/api/health/db', async (req, res) => {
    try {
      if (pool) {
        const result = await pool.query('SELECT NOW() as db_time');
        res.json({
          status: 'connected',
          dbTime: result.rows[0].db_time,
          poolActive: true
        });
      } else {
        if (process.env.NODE_ENV === 'production' && process.env.REQUIRE_POSTGRES === 'true') {
          return res.status(503).json({
            status: 'unhealthy',
            error: 'Database connection pool unavailable in production mode'
          });
        }
        res.json({ status: 'simulated', poolActive: false });
      }
    } catch (err: any) {
      res.status(503).json({
        status: 'unhealthy',
        error: 'Database query failed',
        message: err.message
      });
    }
  });

  // Alias for backward compatibility
  app.get('/api/db-status', async (req, res) => {
    try {
      if (pool) {
        const result = await pool.query('SELECT NOW()');
        res.json({ status: 'connected', time: result.rows[0].now });
      } else {
        res.json({ status: 'simulated' });
      }
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  // 2. API Routers
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

  // 3. Centralized Production Error Handler
  app.use(errorHandlerMiddleware);

  // 4. Frontend Vite / Static Assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`EOM Server running on port ${PORT} [Mode: ${process.env.NODE_ENV || 'development'}]`);
  });

  // 5. Graceful Shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Initiating EOM server graceful shutdown...`);
    server.close(async () => {
      console.log('HTTP server closed.');
      if (pool) {
        await pool.end();
        console.log('PostgreSQL connection pool closed successfully.');
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
