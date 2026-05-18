/**
 * Course Service
 * 
 * Handles CRUD for courses, course materials, and course enrollments.
 * Powered by FastAPI Backend.
 */

import api from './api';
import authService from './authService';

export interface Course {
  id: number;
  title: string;
  description?: string;
  topic: string;
  trainer_id: number;
  status: string;
  thumbnail_url?: string;
  created_at: string;
  updated_at?: string;
  trainer_name?: string;
  material_count?: number;
  enrolled_count?: number;
}

export interface CourseMaterial {
  id: number;
  course_id: number;
  title: string;
  material_type: 'VIDEO' | 'PDF' | 'QUIZ' | 'DOCUMENT' | 'LINK';
  content_url?: string;
  quiz_data?: any;
  description?: string;
  duration_seconds?: number;
  order_index: number;
  created_at: string;
}

export interface CourseEnrollment {
  id: number;
  course_id: number;
  user_id: number;
  progress: number;
  status: string;
  enrolled_at: string;
  completed_at?: string;
  course?: Course;
  user_name?: string;
}

export interface ServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class CourseService {
  private getToken() {
    const token = authService.getAuthToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  }

  // ═══════════════════════════════════════════
  // COURSE CRUD
  // ═══════════════════════════════════════════

  async createCourse(course: {
    title: string;
    description?: string;
    topic: string;
    trainer_id: number;
    status?: string;
  }): Promise<ServiceResponse> {
    try {
      const response = await api.createCourse(this.getToken(), course);
      return response;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async updateCourse(courseId: number, updates: Partial<Course>): Promise<ServiceResponse> {
    try {
      const response = await api.updateCourse(this.getToken(), courseId, updates);
      return response;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async publishCourse(courseId: number): Promise<ServiceResponse> {
    return this.updateCourse(courseId, { status: 'PUBLISHED' } as any);
  }

  async getAllCourses(): Promise<ServiceResponse> {
    try {
      const response = await api.getCourses(this.getToken());
      return response;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async getPublishedCourses(): Promise<ServiceResponse> {
    try {
      const response = await api.getCourses(this.getToken(), 'PUBLISHED');
      return response;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async getTrainerCourses(trainerId: number): Promise<ServiceResponse> {
    try {
      const response = await api.getCourses(this.getToken(), undefined, trainerId);
      return response;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async getCourseById(courseId: number): Promise<ServiceResponse> {
    try {
      const response = await api.getCourse(this.getToken(), courseId);
      return response;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ═══════════════════════════════════════════
  // COURSE MATERIALS
  // ═══════════════════════════════════════════

  async addMaterial(material: {
    course_id: number;
    title: string;
    material_type: string;
    content_url?: string;
    quiz_data?: any;
    description?: string;
    duration_seconds?: number;
    order_index?: number;
  }): Promise<ServiceResponse> {
    try {
      const response = await api.addCourseMaterial(this.getToken(), material.course_id, material);
      return response;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async getCourseMaterials(courseId: number): Promise<ServiceResponse> {
    try {
      const response = await api.getCourseMaterials(this.getToken(), courseId);
      return response;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async deleteMaterial(materialId: number): Promise<ServiceResponse> {
    try {
      const response = await api.deleteCourseMaterial(this.getToken(), materialId);
      return response;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ═══════════════════════════════════════════
  // ENROLLMENTS
  // ═══════════════════════════════════════════

  async enrollTrainees(courseId: number, userIds: number[]): Promise<ServiceResponse> {
    try {
      const response = await api.enrollTrainees(this.getToken(), courseId, userIds);
      return response;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async getEnrolledCourses(userId: number): Promise<ServiceResponse> {
    try {
      const response = await api.getEnrolledCourses(this.getToken(), userId);
      return response;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async updateProgress(courseId: number, userId: number, progress: number): Promise<ServiceResponse> {
    try {
      const response = await api.updateCourseProgress(this.getToken(), courseId, userId, progress);
      return response;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Helper: get all trainees for enrollment selection
  async getAllTrainees(): Promise<ServiceResponse> {
    try {
      const response = await api.getAllTrainees(this.getToken());
      return response;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async getCourseQuizAttempts(materialId: number): Promise<ServiceResponse> {
    try {
      const response = await api.getCourseQuizAttempts(this.getToken(), materialId);
      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async submitCourseQuizAttempt(materialId: number, attemptData: any): Promise<ServiceResponse> {
    try {
      const response = await api.submitCourseQuizAttempt(this.getToken(), materialId, attemptData);
      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  async createCourse(courseData: any): Promise<ServiceResponse> {
    try {
      const response = await api.createCourse(this.getToken(), courseData);
      return response;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create course' };
    }
  }
}

export default new CourseService();
