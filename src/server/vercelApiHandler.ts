import type { Request, Response } from 'express';
import { getEomApp } from './eomApp.js';
import { pool, getSanitizedDbInfo } from '../db/pg.js';

type StartupDiagnostic = { code: string; error: string };

function classifyStartupError(error: unknown): StartupDiagnostic {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();

  if (/database_url is missing or invalid|database_url is required|database_url not set/.test(normalized)) {
    return {
      code: 'DATABASE_URL_MISSING_OR_INVALID',
      error: 'Something went wrong. Please try again.'
    };
  }
  if (/jwt_secret is required/.test(normalized)) {
    return {
      code: 'JWT_SECRET_MISSING',
      error: 'Something went wrong. Please try again.'
    };
  }
  if (/admin_password is required/.test(normalized)) {
    return {
      code: 'ADMIN_PASSWORD_MISSING',
      error: 'Something went wrong. Please try again.'
    };
  }
  if (/persistence lock pool could not be initialized|requestlockpool/.test(normalized)) {
    return {
      code: 'DATABASE_POOL_INITIALIZATION_FAILED',
      error: 'Something went wrong. Please try again.'
    };
  }
  if (/sql schema file is missing/.test(normalized)) {
    return {
      code: 'DATABASE_SCHEMA_FILE_MISSING',
      error: 'Something went wrong. Please try again.'
    };
  }
  if (/schema setup failed|password authentication failed|enotfound|econnrefused|etimedout|connection terminated|no pg_hba|database .* does not exist|permission denied|syntax error|too many connections|server closed the connection/.test(normalized)) {
    return {
      code: 'SUPABASE_CONNECTION_OR_SCHEMA_FAILED',
      error: 'Something went wrong. Please try again.'
    };
  }
  return {
    code: 'API_INITIALIZATION_FAILED',
    error: 'Something went wrong. Please try again.'
  };
}

function firstRouteParam(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? '').trim();
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Vercel's non-Next.js filesystem router supports individual dynamic segments,
 * not Next.js-style catch-all route files. Use this handler from explicit
 * one- and two-segment API route files and then dispatch to the shared Express app.
 */
export async function handleVercelApiRequest(
  req: Request,
  res: Response,
  routeSegments: string[]
): Promise<void> {
  const rawUrl = req.originalUrl || req.url || '/';
  let parsed: URL;

  try {
    parsed = new URL(rawUrl, 'http://localhost');
  } catch {
    parsed = new URL('/', 'http://localhost');
  }

  let pathname = parsed.pathname.replace(/\/+$/, '') || '/';

  // Some Vercel runtime/router combinations expose only the function-local URL.
  // Rebuild the full Express path from the dynamic route parameters in that case.
  if (!pathname.startsWith('/api/')) {
    const safeSegments = routeSegments
      .map((segment) => String(segment || '').trim().replace(/^\/+|\/+$/g, ''))
      .filter(Boolean);

    if (safeSegments.length > 0) {
      pathname = `/api/${safeSegments.join('/')}`;
      const search = new URLSearchParams(parsed.searchParams);
      search.delete('resource');
      search.delete('action');
      const queryString = search.toString();
      req.url = `${pathname}${queryString ? `?${queryString}` : ''}`;
    }
  } else {
    req.url = `${parsed.pathname}${parsed.search}`;
  }

  res.setHeader('Cache-Control', 'no-store');

  // Keep health checks available even if full app initialization is blocked by
  // missing auth settings or a migration issue.
  if (pathname === '/api/health' || pathname === '/health') {
    const dbInfo = getSanitizedDbInfo();
    res.status(200).json({
      status: dbInfo.isConfigured ? 'ok' : 'degraded',
      serverless: true,
      databaseConfigured: dbInfo.isConfigured,
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (
    pathname === '/api/health/db' ||
    pathname === '/health/db' ||
    pathname === '/api/db-status' ||
    pathname === '/db-status'
  ) {
    if (!pool) {
      res.status(503).json({
        status: 'unhealthy',
        code: 'DATABASE_URL_MISSING_OR_INVALID',
        databaseConfigured: false,
        error: 'Something went wrong. Please try again.'
      });
      return;
    }

    try {
      const result = await pool.query('SELECT NOW() AS db_time');
      res.status(200).json({
        status: 'connected',
        databaseConfigured: true,
        dbTime: result.rows[0]?.db_time ?? null
      });
    } catch (error: unknown) {
      console.error('[EOM] Database health check failed:', error instanceof Error ? error.message : error);
      res.status(503).json({
        status: 'unhealthy',
        code: 'DATABASE_QUERY_FAILED',
        databaseConfigured: true,
        error: 'Something went wrong. Please try again.'
      });
    }
    return;
  }

  try {
    const app = await getEomApp();
    app(req, res);
  } catch (error: unknown) {
    const diagnostic = classifyStartupError(error);
    console.error('[EOM] Vercel API initialization failed:', error instanceof Error ? error.message : error);
    if (!res.headersSent) {
      res.status(503).json(diagnostic);
    } else {
      res.end();
    }
  }
}

export function getVercelRouteSegments(req: Request, expectedSegments: string[]): string[] {
  const query = req.query as Record<string, unknown>;
  const names = ['resource', 'action'];
  const fromQuery = names.map((name) => firstRouteParam(query[name]));
  return expectedSegments.map((fallback, index) => fromQuery[index] || fallback);
}
