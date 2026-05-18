/**
 * Notifications Store — Zustand state management for notifications.
 */

import { create } from 'zustand';
import notificationsService from '../services/notificationsService';
import { NotificationType } from '../config/supabase';

interface NotificationState {
  notifications: any[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  fetchNotifications: (userId: number, filters?: { unreadOnly?: boolean; type?: string; limit?: number }) => Promise<void>;
  fetchUnreadCount: (userId: number) => Promise<void>;
  markAsRead: (notificationId: number) => Promise<boolean>;
  markAllAsRead: (userId: number) => Promise<boolean>;
  deleteNotification: (notificationId: number) => Promise<boolean>;
  deleteReadNotifications: (userId: number) => Promise<boolean>;
  createNotification: (userId: number, type: string, title: string, message: string, data?: any) => Promise<boolean>;
  sendBulkNotifications: (userIds: number[], type: string, title: string, message: string, data?: any) => Promise<boolean>;
  sendSessionReminder: (sessionId: number) => Promise<boolean>;
  clearError: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async (userId, filters) => {
    set({ isLoading: true, error: null });
    const result = await notificationsService.getNotifications(userId, filters as any);
    if (result.success) {
      set({ notifications: Array.isArray(result.data) ? result.data : [], isLoading: false });
    } else {
      set({ notifications: [], error: result.error || 'Failed to fetch notifications', isLoading: false });
    }
  },

  fetchUnreadCount: async (userId) => {
    const result = await notificationsService.getUnreadCount(userId);
    if (result.success) {
      set({ unreadCount: result.data?.count || 0 });
    }
  },

  markAsRead: async (notificationId) => {
    const result = await notificationsService.markAsRead(notificationId);
    if (result.success) {
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
      return true;
    }
    return false;
  },

  markAllAsRead: async (userId) => {
    set({ isLoading: true, error: null });
    const result = await notificationsService.markAllAsRead(userId);
    if (result.success) {
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
        isLoading: false,
      }));
      return true;
    } else {
      set({ error: result.error || 'Failed to mark all as read', isLoading: false });
      return false;
    }
  },

  deleteNotification: async (notificationId) => {
    const result = await notificationsService.deleteNotification(notificationId);
    if (result.success) {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== notificationId),
      }));
      return true;
    }
    return false;
  },

  deleteReadNotifications: async (userId) => {
    const result = await notificationsService.deleteReadNotifications(userId);
    if (result.success) {
      set((state) => ({
        notifications: state.notifications.filter((n) => !n.is_read),
      }));
      return true;
    }
    return false;
  },

  createNotification: async (userId, type, title, message, data) => {
    const result = await notificationsService.createNotification(userId, type as any, title, message, data);
    return result.success;
  },

  sendBulkNotifications: async (userIds, type, title, message, data) => {
    const result = await notificationsService.sendBulkNotifications(userIds, type as any, title, message, data);
    return result.success;
  },

  sendSessionReminder: async (sessionId) => {
    const result = await notificationsService.sendSessionReminder(sessionId);
    return result.success;
  },

  clearError: () => set({ error: null }),
}));

export default useNotificationStore;
