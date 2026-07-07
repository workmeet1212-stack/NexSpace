import { Router } from 'express';
import {
  getNotifications,
  getNotificationsUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteReadNotifications,
} from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Notifications
router.get('/', getNotifications);
router.get('/unread-count', getNotificationsUnreadCount);
router.patch('/:notificationId/read', markNotificationAsRead);
router.patch('/read-all', markAllNotificationsAsRead);
router.delete('/:notificationId', deleteNotification);
router.delete('/read', deleteReadNotifications);

export default router;
