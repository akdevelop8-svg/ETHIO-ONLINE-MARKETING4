import type { Request, Response } from 'express';
import {
  getVercelRouteSegments,
  handleVercelApiRequest
} from '../../src/server/vercelApiHandler.js';

export default async function handler(req: Request, res: Response): Promise<void> {
  const resource = typeof req.query.resource === 'string' ? req.query.resource : '';
  const action = typeof req.query.action === 'string' ? req.query.action : '';
  const segments = getVercelRouteSegments(req, [resource, action]);
  await handleVercelApiRequest(req, res, segments);
}
