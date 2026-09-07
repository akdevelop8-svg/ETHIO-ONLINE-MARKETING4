import { Router, Response } from 'express';
import { transactionService } from '../services/transactions/transactionService.js';
import { User, Order } from '../types/index.js';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware.js';
import { transactionRateLimiter } from '../middleware/rateLimiter.js';
import { validateReceiptUpload } from '../services/payments/receiptValidator.js';

export const transactionsRouter = Router();

// Get all transactions for the authenticated user
transactionsRouter.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    let userTx = [];
    if (user.role === 'ADMIN' || user.authRole === 'admin') {
      userTx = transactionService.getAllTransactionsForAdmin(user);
    } else if (user.role === 'SELLER') {
      userTx = transactionService.getTransactionsBySeller(user.id, user);
    } else {
      userTx = transactionService.getTransactionsByBuyer(user.id, user);
    }
    res.json(userTx);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

transactionsRouter.get('/order/:orderId', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const tx = transactionService.getTransactionByOrderId(req.params.orderId, user);
    if (!tx) {
      return res.json(null);
    }

    const isAdmin = user.role === 'ADMIN' || user.authRole === 'admin';
    const isParticipant = user.id === tx.buyerId || user.id === tx.sellerId;
    if (!isAdmin && !isParticipant) {
      return res.status(403).json({ error: 'Unauthorized: Access to this transaction is forbidden.' });
    }

    res.json(tx);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a transaction authoritatively
transactionsRouter.post('/create', requireAuth, transactionRateLimiter, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    if (user.role !== 'BUYER' && user.role !== 'USER' && user.authRole !== 'admin' && user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only authenticated customers can create transactions.' });
      return;
    }
    const { order, paymentMethod } = req.body;
    
    // Server authoritative creation (preserves Phase 10 math)
    const tx = transactionService.createTransactionForOrder(user, order as Order, paymentMethod);
    res.json(tx);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Submit payment with receipt screenshot security validation
transactionsRouter.post('/:id/submit', requireAuth, transactionRateLimiter, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    if (user.role !== 'BUYER' && user.role !== 'USER' && user.authRole !== 'admin' && user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only authenticated customers can submit payment.' });
      return;
    }
    
    const { reference, senderName, proofNotes, proofUrl, paymentMethod } = req.body;

    // Validate receipt upload security
    const receiptCheck = validateReceiptUpload(proofUrl, proofNotes);
    if (!receiptCheck.isValid) {
      return res.status(400).json({ error: receiptCheck.error });
    }

    const tx = transactionService.submitBuyerPayment(user, req.params.id, {
      paymentReference: reference,
      senderName,
      paymentProofNotes: proofNotes,
      paymentProofUrl: receiptCheck.sanitizedUrl || proofUrl,
      paymentMethod
    });

    res.json(tx);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
