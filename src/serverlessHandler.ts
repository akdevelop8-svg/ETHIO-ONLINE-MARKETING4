import type { Request, Response } from 'express';
import { createApp } from '../server.js';

let appPromise: Promise<import('express').Express> | undefined;

/**
 * Shared handler for the Vercel API entry points. The Express app and its
 * database pool are initialized once per warm function instance.
 */
export async function handleApiRequest(req: Request, res: Response): Promise<void> {
  const initialization = appPromise ?? (appPromise = createApp());

  try {
    const app = await initialization;
    app(req, res);
  } catch (error: any) {
    if (appPromise === initialization) appPromise = undefined;
    console.error('EOM Vercel API initialization failed:', error?.message || error);

    if (!res.headersSent) {
      res.status(503).json({
        error: 'The API could not initialize. Verify the Vercel environment variables and Supabase database connection.'
      });
    } else {
      res.end();
    }
  }
}
