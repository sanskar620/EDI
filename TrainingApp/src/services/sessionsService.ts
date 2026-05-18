/**
 * Training Sessions Service
 * 
 * Handles all training session management operations.
 * Powered by FastAPI Backend.
 */

import api from './api';
import authService from './authService';
import { SessionStatus, UserRole } from '../config/supabase'; // keeping enum types

export interface TrainingSession {
  id: number;
  title: string;
  description?: string;
  topic: string;
  module_code: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  venue_name: string;
  campus_id?: number;
  trainer_id: number;
  status: SessionStatus;
  max_capacity: number;
  is_materials_released: boolean;
  pre_test_enabled: boolean;
  post_test_enabled: boolean;
  passing_threshold: number;
  created_at: string;
  updated_at?: string;
}

export interface SessionWithTrainer extends TrainingSession {
  trainer_name?: string;
  enrolled_count?: number;
}

export interface ServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class SessionsService {
  private getToken() {
    const token = authService.getAuthToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  }

  /**
   * Get all sessions with optional filters
   */
  async getSessions(filters?: {
    status?: SessionStatus;
    trainerId?: number;
    topic?: string;
    role?: UserRole;
    currentUserId?: number;
  }): Promise<ServiceResponse> {
    try {
      const params: any = {};
      if (filters?.status) params.status = filters.status;
      if (filters?.trainerId) params.trainer_id = filters.trainerId;
      if (filters?.topic) params.topic = filters.topic;

      // Backend inherently filters by role if you use getSessions() 
      // but let's pass trainer_id specifically if role=TRAINER
      if (filters?.role === 'TRAINER' && filters?.currentUserId) {
        params.trainer_id = filters.currentUserId;
      }

      const response = await api.getSessions(this.getToken(), params);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch sessions',
      };
    }
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: number): Promise<ServiceResponse> {
    try {
      const response = await api.getSession(this.getToken(), sessionId);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch session',
      };
    }
  }

  /**
   * Create new training session (Trainer only)
   */
  async createSession(sessionData: Partial<TrainingSession>): Promise<ServiceResponse> {
    try {
      const response = await api.createSession(this.getToken(), sessionData);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create session',
      };
    }
  }

  /**
   * Update training session (Trainer/owner only)
   */
  async updateSession(
    sessionId: number,
    updates: Partial<TrainingSession>
  ): Promise<ServiceResponse> {
    try {
      const response = await api.updateSession(this.getToken(), sessionId, updates);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update session',
      };
    }
  }

  /**
   * Publish a session — makes it visible to trainees for enrollment
   */
  async publishSession(sessionId: number): Promise<ServiceResponse> {
    return this.updateSession(sessionId, { status: 'PUBLISHED' as SessionStatus });
  }

  /**
   * Delete/Cancel session (soft delete)
   */
  async deleteSession(sessionId: number): Promise<ServiceResponse> {
    try {
      const response = await api.deleteSession(this.getToken(), sessionId);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete session',
      };
    }
  }

  /**
   * Get enrolled users for a session
   */
  async getSessionEnrollments(sessionId: number): Promise<ServiceResponse> {
    try {
      const response = await api.getSessionEnrollments(this.getToken(), sessionId);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch enrollments',
      };
    }
  }

  /**
   * Get modules and materials for a session
   */
  async getSessionModules(sessionId: number): Promise<ServiceResponse> {
    try {
      const response = await api.getSessionModules(this.getToken(), sessionId);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch modules',
      };
    }
  }

  /**
   * Create a module within a session
   */
  async createModule(sessionId: number, data: { title: string; order_number?: number }): Promise<ServiceResponse> {
    try {
      const response = await api.createModule(this.getToken(), sessionId, data);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create module',
      };
    }
  }

  /**
   * Get sessions for a specific user (as trainee)
   */
  async getUserSessions(userId: number): Promise<ServiceResponse> {
    try {
      const response = await api.getUserSessions(this.getToken(), userId);
      if (response.success && Array.isArray(response.data)) {
        response.data = response.data.map((item: any) => ({
          ...item,
          id: item.session_id,
          title: item.session_title,
          topic: item.session_topic,
          scheduled_date: item.session_scheduled_date,
          venue_name: item.session_venue,
          enrollment_status: item.status
        }));
      }
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch user sessions',
      };
    }
  }

  /**
   * Get upcoming/available sessions (all published sessions from today onward)
   */
  async getUpcomingSessions(limit = 50): Promise<ServiceResponse> {
    try {
      const response = await api.getSessions(this.getToken(), { status: 'PUBLISHED' });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch upcoming sessions',
      };
    }
  }

  async submitSessionFeedback(sessionId: number, feedbackData: any): Promise<ServiceResponse> {
    try {
      const response = await api.submitSessionFeedback(this.getToken(), sessionId, feedbackData);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to submit feedback',
      };
    }
  }
}

export default new SessionsService();
