import type { Request, Response } from 'express';
import { pool, getSanitizedDbInfo } from '../src/db/pg.js';

/**
 * Dedicated Vercel endpoint so this check bypasses app initialization.
 */
export default async function handler(_req: Request, res: Response): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');

  const dbInfo = getSanitizedDbInfo();
  if (!pool || !dbInfo.isConfigured) {
    res.status(503).json({
      status: 'unhealthy',
      code: 'DATABASE_URL_MISSING_OR_INVALID',
      databaseConfigured: false,
      error: 'DATABASE_URL is missing or invalid in this Vercel deployment.'
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
    console.error('[EOM] Dedicated database status check failed:', error instanceof Error ? error.message : error);
    res.status(503).json({
      status: 'unhealthy',
      code: 'DATABASE_QUERY_FAILED',
      databaseConfigured: true,
      error: 'The database URL is configured, but the query failed. Check Vercel Runtime Logs.'
    });
  }
}
