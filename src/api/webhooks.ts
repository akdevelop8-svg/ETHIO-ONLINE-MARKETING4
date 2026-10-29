import { Router, Request, Response } from 'express';
import { webhookService } from '../services/payments/webhookService.js';

export const webhooksRouter = Router();

// Express Webhook Receiver: POST /api/webhooks/payment/:provider
webhooksRouter.post('/payment/:provider', async (req: Request, res: Response) => {
  try {
    const providerCode = String(req.params.provider).toUpperCase();
    const headers = req.headers as Record<string, string>;
    const body = req.body;

    const result = await webhookService.processPaymentWebhook({
      providerCode,
      headers,
      body
    });

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err: any) {
    res.status(500).json({
      success: false,
      processed: false,
      error: err.message || 'Webhook processing failed'
    });
  }
});
