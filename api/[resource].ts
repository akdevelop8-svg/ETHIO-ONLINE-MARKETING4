import type { Request, Response } from 'express';
import {
  getVercelRouteSegments,
  handleVercelApiRequest
} from '../src/server/vercelApiHandler.js';

export default async function handler(req: Request, res: Response): Promise<void> {
  const segments = getVercelRouteSegments(req, [
    typeof req.query.resource === 'string' ? req.query.resource : ''
  ]);
  await handleVercelApiRequest(req, res, segments);
}
