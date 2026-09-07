import { Router, Response } from 'express';
import { notificationService } from '../services/notifications/notificationService.js';
import { User } from '../types/index.js';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware.js';

export const notificationsRouter = Router();

notificationsRouter.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    res.json(notificationService.getNotificationsForUser(user));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

notificationsRouter.post('/:id/read', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const isAdmin = user.authRole === 'admin' || user.role === 'ADMIN';
    const notifications = notificationService.getNotificationsForUser(user);
    const target = notifications.find((n) => n.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'Notification not found.' });
    if (target.userId !== user.id && !(isAdmin && target.userId === 'ADMIN')) {
      return res.status(403).json({ error: 'Unauthorized: You cannot modify this notification.' });
    }
    notificationService.markAsRead(target.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

notificationsRouter.post('/read-all', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const isAdmin = user.authRole === 'admin' || user.role === 'ADMIN';
    notificationService.markAllAsRead(user.id, isAdmin);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
