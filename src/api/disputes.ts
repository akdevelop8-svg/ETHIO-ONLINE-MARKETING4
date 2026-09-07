import { Router, Response } from 'express';
import { disputeService } from '../services/disputes/disputeService.js';
import { User, Dispute } from '../types/index.js';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware.js';
import { defaultStorageAdapter } from '../services/persistence/index.js';

export const disputesRouter = Router();

disputesRouter.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    if (user.role === 'ADMIN' || user.authRole === 'admin') {
      res.json(defaultStorageAdapter.getAll<Dispute>('disputes'));
    } else {
      res.json(disputeService.getDisputesForUser(user));
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

disputesRouter.get('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const dispute = disputeService.getDisputeById(req.params.id, user);
    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found or access restricted.' });
    }
    res.json(dispute);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

disputesRouter.get('/order/:orderId', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const dispute = disputeService.getDisputeByOrderId(req.params.orderId, user);
    res.json(dispute || null);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

disputesRouter.post('/create', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const { orderId, reason, description, details, desiredOutcome, customReasonDescription, initialEvidence } = req.body;
    const dispute = disputeService.createDispute(user, {
      orderId,
      reason,
      details: details || description,
      customReasonDescription: customReasonDescription || desiredOutcome,
      initialEvidence
    });
    res.json(dispute);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

disputesRouter.post('/:id/messages', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const { message, attachments } = req.body;
    const updatedDispute = disputeService.sendMessage(user, req.params.id, message, attachments);
    res.json(updatedDispute);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

disputesRouter.post('/:id/evidence', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const updatedDispute = disputeService.submitEvidence(user, req.params.id, req.body);
    res.json(updatedDispute);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
