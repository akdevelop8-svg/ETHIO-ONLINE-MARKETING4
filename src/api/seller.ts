import { Router, Response } from 'express';
import { sellerService } from '../services/seller/sellerService.js';
import { User } from '../types/index.js';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware.js';

export const sellerRouter = Router();

sellerRouter.post('/payout', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    if (user.role !== 'SELLER' && user.role !== 'ADMIN' && user.authRole !== 'admin') {
      return res.status(403).json({ error: 'Only seller accounts can request a payout.' });
    }
    const { amountETB, bankName, accountNumber, accountHolderName } = req.body || {};
    const amount = Number(amountETB);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Valid payout amount is required.' });
    if (!bankName || !accountNumber || !accountHolderName) return res.status(400).json({ error: 'Payout destination details are required.' });
    const payout = sellerService.requestPayout(user, amount, {
      bankName: String(bankName),
      accountNumber: String(accountNumber),
      accountHolderName: String(accountHolderName)
    });
    res.json(payout);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
