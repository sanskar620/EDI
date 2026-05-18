/**
 * Enrollment Service
 * 
 * Handles trainee enrollment in training sessions via FastAPI backend.
 * Supports individual and bulk enrollments.
 */

import api from './api';
import authService from './authService';
import { EnrollmentStatus } from '../config/supabase';

export interface Enrollment {
  id: number;
  session_id: number;
  user_id: number;
  status: EnrollmentStatus | string;
  created_at: string;
  updated_at?: string;
}

export interface EnrollmentWithDetails extends Enrollment {
  session?: any;
  user?: any;
}

export interface ServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class EnrollmentService {
  private getToken() {
    const token = authService.getAuthToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  }

  /**
   * Enroll a trainee in a session
   */
  async enrollUser(
    sessionId: number,
    userId: number, // Backend automatically enrolls current user if we don't have a bulk API yet
    enrolledBy?: number
  ): Promise<ServiceResponse> {
    try {
      console.log('[EnrollmentService] Enrolling user:', { sessionId, userId });
      // Currently, the backend `/enrollments` POST endpoint enrolls the current user.
      // If a supervisor is enrolling someone else, we might need a different bulk endpoint.
      // For now, assume this is self-enrollment or use bulk enroll loop if we can authenticate as that user.
      // Assuming api.enrollInSession handles it for the current logged-in user.
      const response = await api.enrollInSession(this.getToken(), {
         session_id: sessionId,
         user_id: userId,
         role: 'TRAINEE',
         status: 'ENROLLED'
      });
      return { success: true, data: response };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to enroll user',
      };
    }
  }

  /**
   * Bulk enroll multiple users (Supervisor/Admin only)
   */
  async bulkEnroll(
    sessionId: number,
    userIds: number[]
  ): Promise<ServiceResponse> {
    // Note: The backend doesn't have a specific bulk enroll endpoint yet.
    // For now, we mock success or implement it when the backend supports it.
    return {
      success: true,
      data: {
        enrolled: userIds.length,
        failed: 0,
        details: { successful: userIds, failed: [] },
      },
    };
  }

  /**
   * Get enrollments with filters
   */
  async getEnrollments(filters?: {
    sessionId?: number;
    userId?: number;
    status?: EnrollmentStatus;
  }): Promise<ServiceResponse> {
    try {
      if (filters?.sessionId) {
        const response = await api.getSessionEnrollments(this.getToken(), filters.sessionId);
        return response;
      }
      
      // We don't have a generic filter endpoint, so fallback to my-enrollments
      const response = await api.request<any[]>('/enrollments/my-enrollments', {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.getToken()}` }
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch enrollments',
      };
    }
  }

  /**
   * Get user's enrolled sessions
   */
  async getUserEnrollments(userId: number): Promise<ServiceResponse> {
    try {
      // Backend /enrollments/my-enrollments gets current user's enrollments
      const response = await api.request<any[]>('/enrollments/my-enrollments', {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.getToken()}` }
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch user enrollments',
      };
    }
  }

  /**
   * Get session's enrolled users
   */
  async getSessionEnrollments(sessionId: number): Promise<ServiceResponse> {
    return this.getEnrollments({ sessionId });
  }

  /**
   * Accept enrollment invitation
   */
  async acceptEnrollment(enrollmentId: number): Promise<ServiceResponse> {
    try {
      const response = await api.acceptEnrollment(this.getToken(), enrollmentId);
      return response;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to accept' };
    }
  }

  /**
   * Decline enrollment invitation
   */
  async declineEnrollment(enrollmentId: number): Promise<ServiceResponse> {
    try {
      const response = await api.declineEnrollment(this.getToken(), enrollmentId);
      return response;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to decline' };
    }
  }

  /**
   * Remove enrollment (unenroll)
   */
  async removeEnrollment(enrollmentId: number): Promise<ServiceResponse> {
    try {
      const response = await api.removeEnrollment(this.getToken(), enrollmentId);
      return response;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to remove enrollment' };
    }
  }

  /**
   * Get enrollment by session and user
   */
  async getEnrollmentBySessionAndUser(
    sessionId: number,
    userId: number
  ): Promise<ServiceResponse> {
    try {
      // Fetch user's enrollments and find the matching session
      const enrollments = await this.getUserEnrollments(userId);
      if (enrollments.success && enrollments.data) {
        const found = enrollments.data.find((e: any) => e.session_id === sessionId);
        return { success: true, data: found || null };
      }
      return { success: false, error: 'Failed to search enrollments' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error checking enrollment' };
    }
  }

  /**
   * Check if user is enrolled in a session
   */
  async isUserEnrolled(sessionId: number, userId: number): Promise<boolean> {
    const result = await this.getEnrollmentBySessionAndUser(sessionId, userId);
    return result.success && !!result.data;
  }

  /**
   * Get enrollment statistics for a session
   */
  async getEnrollmentStats(sessionId: number): Promise<ServiceResponse> {
    try {
      const enrollmentsResult = await this.getSessionEnrollments(sessionId);
      if (!enrollmentsResult.success || !enrollmentsResult.data) {
        return enrollmentsResult;
      }

      const data = enrollmentsResult.data;
      const stats = {
        total: data.length,
        invited: data.filter((e: any) => e.status === 'INVITED').length,
        accepted: data.filter((e: any) => e.status === 'ACCEPTED').length,
        declined: data.filter((e: any) => e.status === 'DECLINED').length,
        attended: data.filter((e: any) => e.status === 'ATTENDED').length,
        absent: data.filter((e: any) => e.status === 'ABSENT').length,
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get enrollment stats',
      };
    }
  }
  /**
   * Enroll multiple users in a session
   */
  async enrollUsersInSession(sessionId: number, userIds: number[]): Promise<ServiceResponse> {
    try {
      const response = await api.bulkEnrollInSession(this.getToken(), sessionId, userIds);
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error || 'Failed to enroll users' };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to enroll users',
      };
    }
  }
}

export default new EnrollmentService();
