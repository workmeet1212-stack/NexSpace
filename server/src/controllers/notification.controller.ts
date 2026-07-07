import { Request, Response } from 'express';
import { Notification } from '../models/Notification.model';
import { successResponse, errorResponse, paginatedResponse } from '../utils/apiResponse';
import {
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../services/notification.service';
import mongoose from 'mongoose';

// Get notifications
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;
  const { page = '1', limit = '20', unreadOnly = 'false' } = req.query;

  const query: any = { recipient: new mongoose.Types.ObjectId(userId) };

  if (unreadOnly === 'true') {
    query.read = false;
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);

  const [notifications, total] = await Promise.all([
    Notification.find(query)
      .populate('sender', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Notification.countDocuments(query),
  ]);

  paginatedResponse({
    res,
    data: notifications,
    page: pageNum,
    limit: limitNum,
    total,
    message: 'Notifications fetched successfully',
  });
};

// Get unread count
export const getNotificationsUnreadCount = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;

  const count = await getUnreadCount(userId);

  successResponse({
    res,
    data: { unreadCount: count },
    message: 'Unread count fetched',
  });
};

// Mark notification as read
export const markNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
  const { notificationId } = req.params;

  await markAsRead(notificationId);

  successResponse({
    res,
    data: null,
    message: 'Notification marked as read',
  });
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;

  await markAllAsRead(userId);

  successResponse({
    res,
    data: null,
    message: 'All notifications marked as read',
  });
};

// Delete notification
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  const { notificationId } = req.params;

  const notification = await Notification.findById(notificationId);

  if (!notification) {
    errorResponse({ res, message: 'Notification not found', statusCode: 404 });
    return;
  }

  // Check ownership
  if (notification.recipient.toString() !== req.userId) {
    errorResponse({ res, message: 'Not authorized', statusCode: 403 });
    return;
  }

  await Notification.findByIdAndDelete(notificationId);

  successResponse({
    res,
    data: null,
    message: 'Notification deleted',
  });
};

// Delete all read notifications
export const deleteReadNotifications = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;

  await Notification.deleteMany({
    recipient: new mongoose.Types.ObjectId(userId),
    read: true,
  });

  successResponse({
    res,
    data: null,
    message: 'Read notifications deleted',
  });
};
