import type { Request, Response } from 'express';
import { getEomApp } from '../src/server/eomApp.js';

/**
 * Single Vercel serverless entry for all /api/* requests.
 * Keep all database access on the server; never expose DATABASE_URL in VITE_*.
 */
export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    const app = await getEomApp();
    app(req, res);
  } catch (error: any) {
    console.error('[EOM] Vercel API initialization failed:', error?.message || error);
    if (!res.headersSent) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(503).json({
        error: 'The API is not ready. Check the Vercel environment variables and Supabase database connection.'
      });
    } else {
      res.end();
    }
  }
}
