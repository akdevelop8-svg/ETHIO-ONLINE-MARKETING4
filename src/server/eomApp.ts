import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import path from 'node:path';
import bodyParser from 'body-parser';
import { pool, requestLockPool } from '../db/pg.js';
import { PostgresPersistenceAdapter } from '../services/persistence/postgresAdapter.js';
import { setStorageAdapter } from '../services/persistence/index.js';
import { runMigrations } from '../db/migrations.js';
import {
  securityHeadersMiddleware,
  correlationIdMiddleware,
  errorHandlerMiddleware
} from '../middleware/securityMiddleware.js';
import { generalApiRateLimiter } from '../middleware/rateLimiter.js';

const isVercelRuntime = Boolean(process.env.VERCEL);
const REQUEST_LOCK_ID = '8726642118';

let appPromise: Promise<Express> | undefined;
let currentAdapter: PostgresPersistenceAdapter | undefined;

function shouldSkipServerlessStorageLock(originalUrl: string): boolean {
  const pathname = originalUrl.split('?')[0].replace(/\/+$/, '') || '/';
  return /^\/api\/(?:health(?:\/db)?|db-status|ai(?:\/.*)?|community(?:\/.*)?)$/i.test(pathname);
}

/**
 * The existing domain services expose synchronous collection repositories.
 * In Vercel, requests that use those collections are serialized with a
 * transaction-scoped PostgreSQL advisory lock, and the collection cache is
 * refreshed before each request. This prevents separate serverless instances
 * from silently operating on stale copies of backend_storage.
 */
function installServerlessPersistenceMiddleware(app: Express, adapter: PostgresPersistenceAdapter): void {
  app.use('/api', async (req: Request, res: Response, next: NextFunction) => {
    if (shouldSkipServerlessStorageLock(req.originalUrl)) return next();

    if (!pool || !requestLockPool) {
      return res.status(503).json({ error: 'Persistent database is unavailable. Check the Vercel DATABASE_URL setting.' });
    }

    let lockClient: import('pg').PoolClient | undefined;
    try {
      lockClient = await requestLockPool.connect();
      await lockClient.query('BEGIN');
      // Use a transaction-scoped lock so this also works with Supabase's
      // serverless Transaction Pooler (port 6543).
      await lockClient.query('SELECT pg_advisory_xact_lock($1::bigint)', [REQUEST_LOCK_ID]);

      await adapter.flushPendingWrites();
      await adapter.loadAllFromDatabase();

      const originalEnd = res.end.bind(res);
      let endStarted = false;

      (res as any).end = (...args: any[]) => {
        if (endStarted) return originalEnd(...args);
        endStarted = true;

        void (async () => {
          let persistenceFailed = false;
          try {
            await adapter.flushPendingWrites();
          } catch (error: any) {
            persistenceFailed = true;
            console.error('[EOM] Could not confirm persistence before response:', error?.message || error);
          }

          try {
            await lockClient!.query(persistenceFailed ? 'ROLLBACK' : 'COMMIT');
          } catch (error: any) {
            persistenceFailed = true;
            console.error('[EOM] Could not release the database request transaction:', error?.message || error);
            await lockClient!.query('ROLLBACK').catch(() => undefined);
          } finally {
            lockClient!.release();
          }

          if (persistenceFailed && !res.headersSent) {
            res.statusCode = 503;
            res.removeHeader('Content-Length');
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            originalEnd(JSON.stringify({
              error: 'The server could not confirm that the change was saved. Check the database before retrying.'
            }));
            return;
          }

          originalEnd(...args);
        })().catch((error: any) => {
          console.error('[EOM] Finalizing API response failed:', error?.message || error);
          lockClient?.release();
          if (!res.headersSent) {
            res.statusCode = 503;
            res.removeHeader('Content-Length');
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            originalEnd(JSON.stringify({ error: 'Database persistence could not be confirmed.' }));
          } else {
            originalEnd(...args);
          }
        });

        return res;
      };

      next();
    } catch (error) {
      if (lockClient) {
        await lockClient.query('ROLLBACK').catch(() => undefined);
        lockClient.release();
      }
      next(error);
    }
  });
}

async function createEomApp(): Promise<Express> {
  const productionMode = process.env.NODE_ENV === 'production';
  const requirePostgres = isVercelRuntime ||
    (productionMode && process.env.REQUIRE_POSTGRES === 'true');

  // Vercel must never silently fall back to memory-only data.
  if (requirePostgres && !pool) {
    throw new Error('DATABASE_URL is missing or invalid. Configure the Supabase PostgreSQL Transaction Pooler URI in Vercel.');
  }
  if (requirePostgres && !process.env.JWT_SECRET?.trim()) {
    throw new Error('JWT_SECRET is required for production authentication. Configure it in Vercel Environment Variables.');
  }
  if (requirePostgres && !process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_PASSWORD is required for production admin sign-in. Configure it in Vercel Environment Variables.');
  }
  if (isVercelRuntime && !requestLockPool) {
    throw new Error('The Vercel persistence lock pool could not be initialized. Check DATABASE_URL.');
  }

  if (pool) {
    await runMigrations();
  }

  const adapter = new PostgresPersistenceAdapter();
  currentAdapter = adapter;
  // Vercel reloads from PostgreSQL under a request lock, instead of taking a
  // one-time snapshot that would become stale across serverless instances.
  if (!isVercelRuntime) {
    await adapter.loadAllFromDatabase();
  }
  setStorageAdapter(adapter);

  // Domain routers are imported after the persistence adapter is registered.
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
    import('../api/auth.js'),
    import('../api/admin.js'),
    import('../api/transactions.js'),
    import('../api/listings.js'),
    import('../api/orders.js'),
    import('../api/disputes.js'),
    import('../api/webhooks.js'),
    import('../api/ai.js'),
    import('../api/community.js'),
    import('../api/notifications.js'),
    import('../api/seller.js')
  ]);

  const app = express();

  // Optional comma-separated allowlist for intentional cross-origin clients.
  // The same-origin Vercel frontend does not need a separate API origin.
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

  if (isVercelRuntime) {
    installServerlessPersistenceMiddleware(app, adapter);
  }

  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      status: 'ok',
      environment: process.env.NODE_ENV || 'production',
      serverless: isVercelRuntime,
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/health/db', async (_req, res) => {
    try {
      if (!pool) {
        return res.status(503).json({ status: 'unhealthy', error: 'Database connection pool unavailable.' });
      }
      const result = await pool.query('SELECT NOW() AS db_time');
      res.setHeader('Cache-Control', 'no-store');
      return res.json({
        status: 'connected',
        dbTime: result.rows[0].db_time,
        poolActive: true
      });
    } catch (error: any) {
      console.error('[EOM] Database health check failed:', error?.message || error);
      return res.status(503).json({ status: 'unhealthy', error: 'Database query failed.' });
    }
  });

  app.get('/api/db-status', async (_req, res) => {
    try {
      if (!pool) return res.status(503).json({ status: 'unhealthy', error: 'Database is required but not configured.' });
      const result = await pool.query('SELECT NOW() AS db_time');
      return res.json({ status: 'connected', time: result.rows[0].db_time });
    } catch (error: any) {
      console.error('[EOM] Database status check failed:', error?.message || error);
      return res.status(503).json({ status: 'error', error: 'Database query failed.' });
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

  // Unknown API paths always return JSON instead of the SPA HTML document.
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'EOM API endpoint not found. Check the route path.' });
  });

  app.use(errorHandlerMiddleware);

  // Local-only development / optional self-hosted mode. Vercel serves the
  // compiled Vite frontend as static assets and invokes api/[...path].ts.
  if (!isVercelRuntime) {
    if (!productionMode) {
      const { createServer: createViteServer } = await import('vite');
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
  }

  return app;
}

export function getEomApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = createEomApp().catch((error) => {
      appPromise = undefined;
      throw error;
    });
  }
  return appPromise;
}

export async function flushEomWrites(): Promise<void> {
  await currentAdapter?.flushPendingWrites();
}
