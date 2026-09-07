/**
 * EOM Notification Service & Event Hooks
 * Phase 2 - 8: Platform Operations & Alerts
 * Dispatches internal notifications and provides hook interfaces
 * designed for integration with @Ethio_Online_Marketing_Bot and real-time operational alerts.
 */

import { AppNotification, NotificationEventType, User } from '../../types';
import { OFFICIAL_BOT_USERNAME } from '../../constants';
import { notificationRepository, NotificationRepository } from '../persistence';

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-001',
    userId: 'ADMIN',
    type: 'LISTING_SUBMITTED',
    title: 'New Channel Pending Review',
    message: 'Seller Kidus Entertainment submitted Telegram channel "@aradamemes" (62K) for moderation.',
    isRead: false,
    referenceId: 'list-mod-001',
    referenceType: 'listing',
    createdAt: '2026-08-30T18:30:00Z'
  },
  {
    id: 'notif-002',
    userId: 'ADMIN',
    type: 'LISTING_SUBMITTED',
    title: 'New Channel Pending Review',
    message: 'Seller Beti Beauty Tips submitted Instagram account "@addis_glamour" (35K) for moderation.',
    isRead: false,
    referenceId: 'list-mod-002',
    referenceType: 'listing',
    createdAt: '2026-08-30T20:10:00Z'
  }
];

class NotificationService {
  private repo: NotificationRepository;
  private notifications: AppNotification[] = [];
  private isInitialized = false;

  constructor(repo: NotificationRepository = notificationRepository) {
    this.repo = repo;
    this.init();
  }

  private init() {
    if (this.isInitialized) return;
    try {
      const stored = this.repo.findAll();
      if (stored && stored.length > 0) {
        this.notifications = stored;
      } else {
        this.notifications = [...INITIAL_NOTIFICATIONS];
        this.persist();
      }
    } catch {
      this.notifications = [...INITIAL_NOTIFICATIONS];
    }
    this.isInitialized = true;
  }

  private persist() {
    try {
      this.repo.saveAll(this.notifications);
    } catch {
      // Storage safety
    }
  }

  /**
   * Dispatch a notification event hook
   */
  public dispatch(event: {
    targetUserId: string; // user ID or 'ADMIN'
    type: NotificationEventType;
    title: string;
    message: string;
    referenceId?: string;
    referenceType?: 'listing' | 'order' | 'transaction' | 'dispute' | 'user' | 'system';
  }): AppNotification {
    this.init();

    const notif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: event.targetUserId,
      type: event.type,
      title: event.title,
      message: event.message,
      isRead: false,
      referenceId: event.referenceId,
      referenceType: event.referenceType,
      createdAt: new Date().toISOString()
    };

    this.notifications.unshift(notif);
    this.persist();

    // Hook entry point for @Ethio_Online_Marketing_Bot webhook dispatch
    this.triggerBotWebhook(notif);

    return notif;
  }

  /**
   * Telegram Bot integration hook
   */
  private triggerBotWebhook(notif: AppNotification) {
    if (typeof window !== 'undefined' && (window as unknown as { __EOM_DEBUG_NOTIF?: boolean }).__EOM_DEBUG_NOTIF) {
      console.log(`[${OFFICIAL_BOT_USERNAME} Hook] Event ${notif.type}:`, notif.message);
    }
  }

  /**
   * Get notifications for a user or admin
   */
  public getNotificationsForUser(user: User | null): AppNotification[] {
    this.init();
    if (!user) return [];
    if (user.authRole === 'admin' || user.role === 'ADMIN') {
      return this.notifications.filter((n) => n.userId === 'ADMIN' || n.userId === user.id);
    }
    return this.notifications.filter((n) => n.userId === user.id);
  }

  /**
   * Mark a notification as read
   */
  public markAsRead(notificationId: string): void {
    this.init();
    const item = this.notifications.find((n) => n.id === notificationId);
    if (item) {
      item.isRead = true;
      this.persist();
    }
  }

  /**
   * Mark all as read
   */
  public markAllAsRead(userId: string, isAdmin = false): void {
    this.init();
    this.notifications.forEach((n) => {
      if (n.userId === userId || (isAdmin && n.userId === 'ADMIN')) {
        n.isRead = true;
      }
    });
    this.persist();
  }
}

export const notificationService = new NotificationService();
