import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { UserAvatar } from './UserAvatar';
import { Bell, Check, CheckCheck, X, MoreHorizontal } from 'lucide-react';
import { formatDate, formatRelative } from '../../utils/formatDate';
import { cn } from '../../utils/cn';
import { toast } from 'sonner';

interface Notification {
  _id: string;
  type: 'task_assigned' | 'task_mentioned' | 'task_completed' | 'comment' | 'project_invite';
  title: string;
  message: string;
  read: boolean;
  data?: any;
  createdAt: string;
  sender?: {
    _id: string;
    name: string;
    avatar: string | null;
  };
}

const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data.data || [];
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await api.patch(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const unreadCount = notifications?.length > 0 ? notifications.filter((n: Notification) => !n.read).length : [];

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse flex gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <div className="h-3 bg-gray-200 rounded w-3/4" />
                          <div className="h-2 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.slice(0, 10).map((notification: Notification) => (
                      <div
                        key={notification._id}
                        className={cn(
                          'px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer',
                          !notification.read && 'bg-indigo-50/50'
                        )}
                        onClick={() => handleMarkAsRead(notification._id)}
                      >
                        <div className="flex gap-3">
                          {notification.sender ? (
                            <UserAvatar
                              name={notification.sender.name}
                              src={notification.sender.avatar}
                              size="sm"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <Bell className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 font-medium">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatRelative(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                  <button className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                    View all notifications
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;
