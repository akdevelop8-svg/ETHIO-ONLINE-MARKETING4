import type { Request, Response } from 'express';
import { handleApiRequest } from '../src/serverlessHandler.js';

export default function handler(req: Request, res: Response): Promise<void> {
  return handleApiRequest(req, res);
}
