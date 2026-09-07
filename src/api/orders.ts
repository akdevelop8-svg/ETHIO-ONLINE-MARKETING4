import { Router, Response } from 'express';
import { orderService } from '../services/orders/orderService.js';
import { User } from '../types/index.js';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware.js';

export const ordersRouter = Router();

ordersRouter.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    if (user.role === 'ADMIN' || user.authRole === 'admin') {
      res.json(orderService.getAllOrdersForAdmin(user));
    } else {
      res.json(orderService.getOrdersForUser(user.id));
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ordersRouter.get('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const order = orderService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const isAdmin = user.role === 'ADMIN' || user.authRole === 'admin';
    const isParticipant = user.id === order.buyerId || user.id === order.sellerId;

    if (!isAdmin && !isParticipant) {
      return res.status(403).json({ error: 'Unauthorized: Access to this order is forbidden.' });
    }

    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ordersRouter.post('/create', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const { listingId, paymentMethod, notes, buyerPhone, buyerTelegram } = req.body;
    const order = orderService.createOrder(
      user,
      listingId,
      paymentMethod || 'TELEBIRR',
      notes,
      { phone: buyerPhone, telegram: buyerTelegram }
    );
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

ordersRouter.post('/:id/accept', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const existingOrder = orderService.getOrderById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const isAdmin = user.role === 'ADMIN' || user.authRole === 'admin';
    const isSeller = existingOrder.sellerId === user.id;

    if (!isAdmin && !isSeller) {
      return res.status(403).json({ error: 'Unauthorized: Only the seller of this order can accept it.' });
    }

    const order = orderService.updateOrderStatus(user, req.params.id, 'PROCESSING');
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

ordersRouter.post('/:id/reject', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const existingOrder = orderService.getOrderById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const isAdmin = user.role === 'ADMIN' || user.authRole === 'admin';
    const isSeller = existingOrder.sellerId === user.id;

    if (!isAdmin && !isSeller) {
      return res.status(403).json({ error: 'Unauthorized: Only the seller of this order can reject it.' });
    }

    const order = orderService.updateOrderStatus(user, req.params.id, 'CANCELLED');
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

ordersRouter.post('/:id/complete', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const existingOrder = orderService.getOrderById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const isAdmin = user.role === 'ADMIN' || user.authRole === 'admin';
    const isParticipant = user.id === existingOrder.buyerId || user.id === existingOrder.sellerId;

    if (!isAdmin && !isParticipant) {
      return res.status(403).json({ error: 'Unauthorized: Only transaction participants can complete the order.' });
    }

    const order = orderService.completeOrder(user, req.params.id);
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

ordersRouter.post('/:id/cancel', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const existingOrder = orderService.getOrderById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const isAdmin = user.role === 'ADMIN' || user.authRole === 'admin';
    const isBuyer = existingOrder.buyerId === user.id;

    if (!isAdmin && !isBuyer) {
      return res.status(403).json({ error: 'Unauthorized: Only the buyer or admin can cancel this order.' });
    }

    const order = orderService.cancelOrderAsBuyer(user, req.params.id, req.body.reason);
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
