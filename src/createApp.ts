import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { pool } from './db/pg.js';
import { PostgresPersistenceAdapter } from './services/persistence/postgresAdapter.js';
import { setStorageAdapter } from './services/persistence/index.js';
import { runMigrations } from './db/migrations.js';
import {
  securityHeadersMiddleware,
  correlationIdMiddleware,
  errorHandlerMiddleware
} from './middleware/securityMiddleware.js';
import { generalApiRateLimiter } from './middleware/rateLimiter.js';

// The persistence layer is synchronous for existing domain services. On Vercel,
// refresh it from PostgreSQL and serialize API requests across function instances
// so one warm instance cannot overwrite a newer collection snapshot from another.
const VERCEL_LOCK_NAMESPACE = 4546381;
const VERCEL_LOCK_ID = 1;
let localApiRequestQueue: Promise<void> = Promise.resolve();
let activeAdapter: PostgresPersistenceAdapter | null = null;

async function enterLocalApiQueue(): Promise<() => void> {
  const previous = localApiRequestQueue;
  let release!: () => void;
  localApiRequestQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  return release;
}

export async function createApp(): Promise<express.Express> {
  const requirePostgres =
    process.env.NODE_ENV === 'production' &&
    (process.env.REQUIRE_POSTGRES === 'true' || process.env.VERCEL === '1');

  // In Vercel production, fail closed if durable storage is missing rather than
  // silently accepting accounts/orders into an instance-local memory cache.
  if (requirePostgres && !pool) {
    throw new Error('DATABASE_URL is missing or invalid while PostgreSQL persistence is required. Configure the Supabase PostgreSQL Session Pooler URI.');
  }

  if (pool) {
    await runMigrations();
  }

  const adapter = new PostgresPersistenceAdapter();
  await adapter.loadAllFromDatabase();
  activeAdapter = adapter;
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
    import('./api/auth.js'),
    import('./api/admin.js'),
    import('./api/transactions.js'),
    import('./api/listings.js'),
    import('./api/orders.js'),
    import('./api/disputes.js'),
    import('./api/webhooks.js'),
    import('./api/ai.js'),
    import('./api/community.js'),
    import('./api/notifications.js'),
    import('./api/seller.js')
  ]);

  const app = express();

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

  // The current domain services use synchronous collection snapshots. While the
  // application is hosted as Vercel Functions, guard those snapshots with a
  // PostgreSQL session-level advisory lock, refresh after taking the lock, and
  // wait for queued writes before acknowledging a successful response.
  if (process.env.VERCEL === '1' && pool) {
    app.use('/api', async (req, res, next) => {
      const releaseLocalQueue = await enterLocalApiQueue();
      let lockClient: any;
      let lockAcquired = false;
      let finalized = false;

      const finishRequest = async () => {
        if (finalized) return;
        finalized = true;
        try {
          await adapter.flushPendingWrites();
        } catch (err: any) {
          console.error('Final PostgreSQL flush failed:', err?.message || err);
        } finally {
          if (lockClient) {
            if (lockAcquired) {
              try {
                await lockClient.query('SELECT pg_advisory_unlock($1, $2)', [
                  VERCEL_LOCK_NAMESPACE,
                  VERCEL_LOCK_ID
                ]);
              } catch (err: any) {
                console.error('Failed to release PostgreSQL request lock:', err?.message || err);
              }
            }
            lockClient.release();
          }
          releaseLocalQueue();
        }
      };

      try {
        lockClient = await pool.connect();
        await lockClient.query('SELECT pg_advisory_lock($1, $2)', [
          VERCEL_LOCK_NAMESPACE,
          VERCEL_LOCK_ID
        ]);
        lockAcquired = true;

        // Every request sees the newest committed data written by any Vercel
        // instance. The global lock prevents a concurrent collection snapshot
        // from replacing another request's newer data.
        await adapter.loadAllFromDatabase();

        // Existing services issue writes synchronously but persist them
        // asynchronously. Do not send a success response until those writes
        // have completed; surface storage failures as a retryable 503.
        const originalSend = res.send.bind(res);
        let sendStarted = false;
        res.send = ((...args: any[]) => {
          if (sendStarted) return res;
          sendStarted = true;
          void adapter.flushPendingWrites()
            .then(() => originalSend(...args))
            .catch((err: any) => {
              console.error('PostgreSQL persistence failed before response:', err?.message || err);
              if (res.headersSent) return;
              res.statusCode = 503;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              originalSend(JSON.stringify({
                error: 'The database could not save this request. Please retry.'
              }));
            });
          return res;
        }) as typeof res.send;

        res.once('finish', () => { void finishRequest(); });
        res.once('close', () => {
          if (!res.writableFinished) void finishRequest();
        });
        return next();
      } catch (err) {
        if (lockClient) {
          if (lockAcquired) {
            await lockClient.query('SELECT pg_advisory_unlock($1, $2)', [
              VERCEL_LOCK_NAMESPACE,
              VERCEL_LOCK_ID
            ]).catch(() => undefined);
          }
          lockClient.release();
        }
        releaseLocalQueue();
        return next(err);
      }
    });
  }

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

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'EOM API endpoint not found. Check the API route and backend deployment.' });
  });

  app.use(errorHandlerMiddleware);

  return app;
}


export async function flushPendingWrites(): Promise<void> {
  await activeAdapter?.flushPendingWrites();
}
