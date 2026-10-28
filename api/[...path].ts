import { appPromise } from '../server.js';

/**
 * Route all /api/* requests through the existing Express API.
 * Vercel invokes this handler per request; appPromise reuses the initialized
 * Express application within a warm function instance.
 */
export default async function handler(req: any, res: any) {
  try {
    const app = await appPromise;
    return app(req, res);
  } catch (error: any) {
    console.error('EOM serverless API initialization failed:', error?.message || error);
    if (!res.headersSent) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'API initialization failed. Check server-side environment variables and logs.' }));
    }
  }
}
