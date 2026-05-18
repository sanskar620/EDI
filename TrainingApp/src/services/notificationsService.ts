/**
 * Notifications Service
 * 
 * Handles user notifications storage and retrieval.
 * Integrates with push notifications (FCM) via FastAPI Backend.
 */

import api from './api';
import authService from './authService';
import { NotificationType } from '../config/supabase'; // We'll keep the enum from here for now

export interface Notification {
  id: number;
  user_id: number;
  notification_type: NotificationType | string;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

export interface ServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class NotificationsService {
  private getToken() {
    const token = authService.getAuthToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  }

  /**
   * Create a notification for a user
   */
  async createNotification(
    userId: number,
    type: NotificationType | string,
    title: string,
    message: string,
    data?: any
  ): Promise<ServiceResponse> {
    try {
      const response = await api.sendNotifications(
        this.getToken(),
        [userId],
        type as string,
        title,
        message,
        data
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create notification',
      };
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendBulkNotifications(
    userIds: number[],
    type: NotificationType | string,
    title: string,
    message: string,
    extraData?: any
  ): Promise<ServiceResponse> {
    try {
      const response = await api.sendNotifications(
        this.getToken(),
        userIds,
        type as string,
        title,
        message,
        extraData
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send bulk notifications',
      };
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: number, // In backend, it gets my-notifications based on token
    filters?: {
      unreadOnly?: boolean;
      type?: NotificationType;
      limit?: number;
    }
  ): Promise<ServiceResponse> {
    try {
      const response = await api.getMyNotifications(
        this.getToken(),
        filters?.unreadOnly || false
      );
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      let filtered = response.data || [];
      if (filters?.type) {
        filtered = filtered.filter((n: any) => n.notification_type === filters.type);
      }
      
      if (filters?.limit) {
        filtered = filtered.slice(0, filters.limit);
      }
      
      return {
        success: true,
        data: filtered,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch notifications',
      };
    }
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(userId: number): Promise<ServiceResponse> {
    try {
      const response = await api.getMyNotifications(this.getToken(), true);
      const count = response.success && response.data ? response.data.length : 0;
      return {
        success: true,
        data: { count },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get unread count',
      };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number): Promise<ServiceResponse> {
    try {
      const response = await api.markNotificationRead(this.getToken(), notificationId);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to mark as read',
      };
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: number): Promise<ServiceResponse> {
    try {
      const response = await api.markAllNotificationsRead(this.getToken());
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to mark all as read',
      };
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: number): Promise<ServiceResponse> {
    try {
      const response = await api.deleteNotification(this.getToken(), notificationId);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete notification',
      };
    }
  }

  /**
   * Delete all read notifications for a user
   */
  async deleteReadNotifications(userId: number): Promise<ServiceResponse> {
    try {
      const response = await api.deleteReadNotifications(this.getToken());
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete notifications',
      };
    }
  }

  /**
   * Send session reminder notifications (24 hours before)
   */
  async sendSessionReminder(sessionId: number): Promise<ServiceResponse> {
    try {
      const sessionRes = await api.getSession(this.getToken(), sessionId);
      if (!sessionRes.success || !sessionRes.data) {
        return { success: false, error: 'Session not found' };
      }
      const sessionResponse = sessionRes.data;
      
      const enrollmentsRes = await api.getSessionEnrollments(this.getToken(), sessionId);
      if (!enrollmentsRes.success || !enrollmentsRes.data) {
        return { success: false, error: 'Could not fetch enrollments' };
      }
      const userIds = enrollmentsRes.data.map((e: any) => e.user_id);
      
      if (userIds.length === 0) {
        return { success: true, data: { sent: 0, message: 'No enrolled users' } };
      }
      
      return this.sendBulkNotifications(
        userIds,
        NotificationType.REMINDER_24H,
        'Training Reminder',
        `Training session "${sessionResponse.title}" starts tomorrow at ${new Date(sessionResponse.scheduled_date).toLocaleTimeString()}`,
        { session_id: sessionId }
      );
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to send reminder' };
    }
  }

  /**
   * Send material release notification
   */
  async sendMaterialReleaseNotification(
    sessionId: number,
    materialTitle: string
  ): Promise<ServiceResponse> {
    try {
      const sessionRes = await api.getSession(this.getToken(), sessionId);
      if (!sessionRes.success || !sessionRes.data) {
        return { success: false, error: 'Session not found' };
      }
      const sessionResponse = sessionRes.data;
      
      const enrollmentsRes = await api.getSessionEnrollments(this.getToken(), sessionId);
      if (!enrollmentsRes.success || !enrollmentsRes.data) {
        return { success: false, error: 'Could not fetch enrollments' };
      }
      const userIds = enrollmentsRes.data.map((e: any) => e.user_id);
      
      if (userIds.length === 0) {
        return { success: true, data: { sent: 0 } };
      }
      
      return this.sendBulkNotifications(
        userIds,
        NotificationType.MATERIAL_RELEASED,
        'New Material Available',
        `"${materialTitle}" has been uploaded for ${sessionResponse.title}`,
        { session_id: sessionId }
      );
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to send material notification' };
    }
  }

  /**
   * Send assessment result notification
   */
  async sendAssessmentResultNotification(
    userId: number,
    sessionTitle: string,
    score: number,
    passed: boolean
  ): Promise<ServiceResponse> {
    return this.createNotification(
      userId,
      NotificationType.RESULT_PUBLISHED,
      'Assessment Results',
      `Your ${sessionTitle} assessment result: ${score}% - ${passed ? 'Passed' : 'Failed'}`,
      { score, passed }
    );
  }
}

export default new NotificationsService();
