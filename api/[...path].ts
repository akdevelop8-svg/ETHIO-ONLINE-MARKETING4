import type { Request, Response } from 'express';
import { getEomApp } from '../src/server/eomApp.js';

/**
 * Vercel serverless entry point for the EOM Express API.
 *
 * Without this catch-all function, the Vite frontend deploys successfully but
 * /api/auth/* routes do not exist on Vercel and return the platform's 404 page.
 * More-specific files such as api/health/db.ts continue to take precedence.
 */
export default async function handler(req: Request, res: Response): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const app = await getEomApp();
    app(req, res);
  } catch (error: unknown) {
    console.error(
      '[EOM] Vercel API initialization failed:',
      error instanceof Error ? error.message : error
    );

    if (!res.headersSent) {
      res.status(503).json({
        error: 'The API could not start. Check Vercel Runtime Logs and environment variables.'
      });
    }
  }
}
