import type { Request, Response } from 'express';
import { getEomApp } from '../src/server/eomApp.js';
import { pool, getSanitizedDbInfo } from '../src/db/pg.js';

type StartupDiagnostic = { code: string; error: string };

/**
 * Return actionable but safe startup diagnostics. Never send raw database errors,
 * connection strings, passwords, JWT secrets, or provider error details to clients.
 */
function classifyStartupError(error: unknown): StartupDiagnostic {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();

  if (/database_url is missing or invalid|database_url is required|database_url not set/.test(normalized)) {
    return {
      code: 'DATABASE_URL_MISSING_OR_INVALID',
      error: 'DATABASE_URL is missing or invalid. Add the real Supabase PostgreSQL connection URI to Vercel Environment Variables.'
    };
  }
  if (/jwt_secret is required/.test(normalized)) {
    return {
      code: 'JWT_SECRET_MISSING',
      error: 'JWT_SECRET is missing. Add a strong private JWT_SECRET in Vercel Environment Variables.'
    };
  }
  if (/admin_password is required/.test(normalized)) {
    return {
      code: 'ADMIN_PASSWORD_MISSING',
      error: 'ADMIN_PASSWORD is missing. Add a private ADMIN_PASSWORD in Vercel Environment Variables.'
    };
  }
  if (/persistence lock pool could not be initialized|requestlockpool/.test(normalized)) {
    return {
      code: 'DATABASE_POOL_INITIALIZATION_FAILED',
      error: 'The Supabase database pool could not be initialized. Check DATABASE_URL and its Transaction Pooler host/port.'
    };
  }
  if (/sql schema file is missing/.test(normalized)) {
    return {
      code: 'DATABASE_SCHEMA_FILE_MISSING',
      error: 'The database schema file was not included in the Vercel deployment package. Redeploy the latest GitHub commit.'
    };
  }
  if (
    /schema setup failed|password authentication failed|enotfound|econnrefused|etimedout|connection terminated|no pg_hba|database .* does not exist|permission denied|syntax error|too many connections|server closed the connection/.test(normalized)
  ) {
    return {
      code: 'SUPABASE_CONNECTION_OR_SCHEMA_FAILED',
      error: 'The API could not connect to Supabase or apply the database schema. Verify the connection URI, database password, Transaction Pooler port, SSL settings, and Supabase project status.'
    };
  }
  return {
    code: 'API_INITIALIZATION_FAILED',
    error: 'The API failed to start. Open Vercel Runtime Logs and inspect the [EOM] Vercel API initialization failed entry.'
  };
}

/**
 * Health endpoints must remain callable even when database configuration or
 * application startup fails; otherwise the health route hides the real cause.
 */
function getRequestPath(req: Request): string {
  const rawUrl = req.originalUrl || req.url || '/';
  try {
    return new URL(rawUrl, 'http://localhost').pathname.replace(/\/+$/, '') || '/';
  } catch {
    return rawUrl.split('?')[0].replace(/\/+$/, '') || '/';
  }
}

async function handleHealthRequest(pathname: string, res: Response): Promise<boolean> {
  if (pathname === '/api/health' || pathname === '/health') {
    const dbInfo = getSanitizedDbInfo();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      status: dbInfo.isConfigured ? 'ok' : 'degraded',
      serverless: true,
      databaseConfigured: dbInfo.isConfigured,
      timestamp: new Date().toISOString()
    });
    return true;
  }

  if (
    pathname === '/api/health/db' ||
    pathname === '/health/db' ||
    pathname === '/api/db-status' ||
    pathname === '/db-status'
  ) {
    res.setHeader('Cache-Control', 'no-store');
    if (!pool) {
      res.status(503).json({
        status: 'unhealthy',
        code: 'DATABASE_URL_MISSING_OR_INVALID',
        error: 'DATABASE_URL is missing or invalid in this Vercel deployment.',
        databaseConfigured: false
      });
      return true;
    }

    try {
      const result = await pool.query('SELECT NOW() AS db_time');
      res.status(200).json({
        status: 'connected',
        dbTime: result.rows[0].db_time,
        databaseConfigured: true
      });
    } catch (error: unknown) {
      console.error('[EOM] Database health check failed:', error instanceof Error ? error.message : error);
      res.status(503).json({
        status: 'unhealthy',
        code: 'DATABASE_QUERY_FAILED',
        error: 'The database URI is configured, but the API could not query Supabase. Check Vercel Runtime Logs.'
      });
    }
    return true;
  }

  return false;
}

/**
 * Single Vercel serverless entry for all /api/* requests.
 * Keep all database access on the server; never expose DATABASE_URL in VITE_*.
 */
export default async function handler(req: Request, res: Response): Promise<void> {
  const pathname = getRequestPath(req);

  // These diagnostics intentionally run before getEomApp(), which requires a
  // database and authentication configuration during production startup.
  if (await handleHealthRequest(pathname, res)) return;

  try {
    const app = await getEomApp();
    app(req, res);
  } catch (error: unknown) {
    const diagnostic = classifyStartupError(error);
    // Log the detailed error only in the private Vercel runtime logs.
    console.error('[EOM] Vercel API initialization failed:', error instanceof Error ? error.message : error);
    if (!res.headersSent) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(503).json(diagnostic);
    } else {
      res.end();
    }
  }
}
