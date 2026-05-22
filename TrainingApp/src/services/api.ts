/**
 * API Service - Handles all backend communication using Axios Interceptors
 */

export const API_BASE_URL = 'http://10.57.228.102:8000/api/v1';

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { jwtDecode } from 'jwt-decode';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiService {
  private axiosInstance: AxiosInstance;
  private isRefreshing = false;
  private refreshQueue: Array<(token: string) => void> = [];

  constructor(baseUrl: string) {
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
    });

    // Request Interceptor: Attach Token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token && config.headers) {
          if (!config.headers.Authorization && !config.headers.authorization) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response Interceptor: Handle 401 & Auto-Refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (
          !error.response ||
          error.response.status !== 401 ||
          originalRequest.url?.includes('/auth/login') ||
          originalRequest.url?.includes('/auth/refresh')
        ) {
          return Promise.reject(error);
        }

        if (!originalRequest._retry) {
          originalRequest._retry = true;

          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.refreshQueue.push((newToken: string) => {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                resolve(this.axiosInstance(originalRequest));
              });
            });
          }

          this.isRefreshing = true;

          try {
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            // Important: Use vanilla fetch or fresh axios to avoid interceptor loop
            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: refreshToken })
            });
            
            if (!response.ok) throw new Error('Refresh token invalid');
            
            const data = await response.json();

            if (data && data.access_token) {
              const newAccessToken = data.access_token;
              const newRefreshToken = data.refresh_token;

              await AsyncStorage.setItem('auth_token', newAccessToken);
              await AsyncStorage.setItem('refresh_token', newRefreshToken);

              this.refreshQueue.forEach((cb) => cb(newAccessToken));
              this.refreshQueue = [];

              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return this.axiosInstance(originalRequest);
            } else {
              throw new Error('Invalid refresh response');
            }
          } catch (refreshError) {
            this.refreshQueue = [];
            // Force logout
            setTimeout(async () => {
              await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user', 'current_user']);
            }, 0);
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async ensureValidToken(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return false;

      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
      if (decoded.exp < currentTime + 60) {
        console.log('[Token] Token expiring soon, refreshing proactively...');
        try {
          await this.axiosInstance.get('/auth/me');
          return true;
        } catch (e) {
          return false;
        }
      }
      return true;
    } catch (e) {
      console.error('[Token] ensureValidToken error:', e);
      return false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const method = options.method || 'GET';
      const url = endpoint;
      let data = options.body;
      
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {}
      }

      const headers: any = { ...options.headers };
      
      if (options.body instanceof FormData) {
         delete headers['Content-Type'];
      } else if (!headers['Content-Type']) {
         headers['Content-Type'] = 'application/json';
      }

      const response = await this.axiosInstance.request({
        url,
        method,
        data,
        headers,
      });

      return { success: true, data: response.data };
    } catch (error: any) {
      console.log(`[API Error ${endpoint}]:`, error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.detail || error.response?.data?.message || error.message || 'Request failed' 
      };
    }
  }

  // ═══════════════════════════════════════════
  // AUTH ENDPOINTS
  // ═══════════════════════════════════════════

  async verifyIdentity(employeeId: string, mobileNumber: string) {
    return this.request<{
      success: boolean;
      message: string;
      user_id: number | null;
      full_name: string;
      masked_mobile: string;
      role?: string;
    }>('/auth/verify-identity', {
      method: 'POST',
      body: JSON.stringify({
        employee_id: employeeId,
        mobile_number: mobileNumber,
      }),
    });
  }

  async sendOtp(employeeId: string, mobileNumber: string) {
    return this.request<{
      success: boolean;
      message: string;
      expires_in_seconds: number;
    }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({
        employee_id: employeeId,
        mobile_number: mobileNumber,
      }),
    });
  }

  async verifyOtp(employeeId: string, otp: string) {
    return this.request<{
      success: boolean;
      message: string;
      requires_face_verification: boolean;
      requires_device_binding: boolean;
    }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        employee_id: employeeId,
        otp: otp,
      }),
    });
  }

  async login(employeeId: string, deviceId: string, deviceModel: string) {
    return this.request<{
      access_token: string;
      refresh_token: string;
      token_type: string;
      role: string;
      user_id: number;
      full_name: string;
      employee_id: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        employee_id: employeeId,
        device_id: deviceId,
        device_model: deviceModel,
      }),
    });
  }

  
  async bindDevice(employeeId: string, deviceId: string, deviceModel: string) {
    return this.request<{
      access_token: string;
      refresh_token: string;
      token_type: string;
      role: string;
      user_id: number;
      full_name: string;
      employee_id: string;
    }>('/auth/bind-device', {
      method: 'POST',
      body: JSON.stringify({
        employee_id: employeeId,
        device_id: deviceId,
        device_model: deviceModel,
      }),
    });
  }

  async getProfile(accessToken: string) {
    return this.request<{
      id: number;
      employee_id: string;
      full_name: string;
      email: string;
      role: string;
      department: string;
      designation: string;
    }>('/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  // DEV ONLY - Get OTP for testing
  async getDevOtp(employeeId: string) {
    return this.request<{ otp: string; source: string }>(`/auth/dev/otp/${employeeId}`, {
      method: 'GET',
    });
  }

  // ═══════════════════════════════════════════
  // COURSES ENDPOINTS
  // ═══════════════════════════════════════════

  async getCourses(accessToken: string, status?: string, trainerId?: number) {
    let url = '/courses';
    const params = [];
    if (status) params.push(`status=${status}`);
    if (trainerId) params.push(`trainer_id=${trainerId}`);
    if (params.length > 0) url += '?' + params.join('&');

    return this.request<any[]>(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async getCourse(accessToken: string, courseId: number) {
    return this.request<any>(`/courses/${courseId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async createCourse(accessToken: string, courseData: any) {
    return this.request<any>('/courses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(courseData),
    });
  }

  async updateCourse(accessToken: string, courseId: number, courseData: any) {
    return this.request<any>(`/courses/${courseId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(courseData),
    });
  }

  async getCourseMaterials(accessToken: string, courseId: number) {
    return this.request<any[]>(`/courses/${courseId}/materials`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async addCourseMaterial(accessToken: string, courseId: number, materialData: any) {
    return this.request<any>(`/courses/${courseId}/materials`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(materialData),
    });
  }

  async deleteCourseMaterial(accessToken: string, materialId: number) {
    return this.request<any>(`/courses/materials/${materialId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async enrollTrainees(accessToken: string, courseId: number, userIds: number[]) {
    return this.request<any>(`/courses/${courseId}/enroll`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ user_ids: userIds }),
    });
  }

  async getEnrolledCourses(accessToken: string, userId: number) {
    return this.request<any[]>(`/courses/user/${userId}/enrollments`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async updateCourseProgress(accessToken: string, courseId: number, userId: number, progress: number) {
    return this.request<any>(`/courses/${courseId}/progress/${userId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ progress }),
    });
  }

  async getCourseQuizAttempts(accessToken: string, materialId: number) {
    return this.request<any[]>(`/courses/materials/${materialId}/quiz-attempts`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async submitCourseQuizAttempt(accessToken: string, materialId: number, attemptData: any) {
    return this.request<any>(`/courses/materials/${materialId}/quiz-attempts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(attemptData),
    });
  }

  // ═══════════════════════════════════════════
  // USERS / TRAINEES
  // ═══════════════════════════════════════════

  async getAllTrainees(accessToken: string) {
    return this.request<any[]>('/users?role=TRAINEE', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
  // ═══════════════════════════════════════════
  // SESSIONS ENDPOINTS
  // ═══════════════════════════════════════════

  async getSessions(accessToken: string, params: Record<string, any> = {}) {
    let url = '/sessions';
    const queryParams = [];
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        queryParams.push(`${key}=${encodeURIComponent(value)}`);
      }
    }
    if (queryParams.length > 0) url += '?' + queryParams.join('&');

    return this.request<any[]>(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async getSession(accessToken: string, sessionId: number) {
    return this.request<any>(`/sessions/${sessionId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async createSession(accessToken: string, sessionData: any) {
    return this.request<any>('/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(sessionData),
    });
  }

  async updateSession(accessToken: string, sessionId: number, sessionData: any) {
    return this.request<any>(`/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(sessionData),
    });
  }

  async deleteSession(accessToken: string, sessionId: number) {
    return this.request<any>(`/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async getSessionEnrollments(accessToken: string, sessionId: number) {
    return this.request<any[]>(`/sessions/${sessionId}/enrollments`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async enrollInSession(accessToken: string, data: { session_id: number; user_id?: number; role?: string; status?: string }) {
    return this.request<any>(`/enrollments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
  }

  async getMyEnrollments(accessToken: string) {
    return this.request<any[]>('/enrollments/my-enrollments', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async bulkEnrollInSession(accessToken: string, sessionId: number, userIds: number[]) {
    return this.request<any>('/enrollments/bulk', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ session_id: sessionId, user_ids: userIds }),
    });
  }

  async getSessionModules(accessToken: string, sessionId: number) {
    return this.request<any[]>(`/sessions/${sessionId}/modules`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async createModule(accessToken: string, sessionId: number, data: { title: string; order_number?: number }) {
    return this.request<any>(`/sessions/${sessionId}/modules`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
  }

  // Not directly in backend yet, using standard getSessions for now
  async getUserSessions(accessToken: string, userId: number) {
    // Use the my-enrollments endpoint which returns sessions the user is enrolled in
    return this.request<any[]>(`/enrollments/my-enrollments`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
  async submitSessionFeedback(accessToken: string, sessionId: number, feedbackData: any) {
    return this.request<any>(`/sessions/${sessionId}/feedback`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(feedbackData),
    });
  }
  // ═══════════════════════════════════════════
  // ASSESSMENTS ENDPOINTS
  // ═══════════════════════════════════════════

  async createQuestion(accessToken: string, questionData: any) {
    return this.request<any>('/assessments/questions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(questionData),
    });
  }

  async getSessionQuestions(accessToken: string, sessionId: number, includeAnswers: boolean = false) {
    return this.request<any[]>(`/assessments/questions/session/${sessionId}?include_answers=${includeAnswers}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async deleteQuestion(accessToken: string, questionId: number) {
    return this.request<any>(`/assessments/questions/${questionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async startAssessment(accessToken: string, sessionId: number, assessmentType: string) {
    return this.request<any>('/assessments/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ session_id: sessionId, assessment_type: assessmentType }),
    });
  }

  async submitAnswer(accessToken: string, assessmentId: number, questionId: number, selectedAnswer: string) {
    return this.request<any>(`/assessments/answer/${assessmentId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ question_id: questionId, selected_answer: selectedAnswer }),
    });
  }

  async submitAssessment(accessToken: string, assessmentId: number) {
    return this.request<any>(`/assessments/submit/${assessmentId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async getAssessmentResults(accessToken: string, assessmentId: number) {
    return this.request<any>(`/assessments/results/${assessmentId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async getUserAssessmentHistory(accessToken: string, userId: number) {
    return this.request<any[]>(`/assessments/user/${userId}/history`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
  // ═══════════════════════════════════════════
  // MATERIALS ENDPOINTS
  // ═══════════════════════════════════════════

  async uploadMaterial(accessToken: string, formData: FormData) {
    try {
      const response = await fetch(`${API_BASE_URL}/materials/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Upload failed');
      }
      
      const data = await response.json();
      return { success: true, data };
    } catch (e: any) {
      console.log(`[API Error /materials/upload]:`, e);
      return { success: false, error: e.message };
    }
  }

  async getMaterials(accessToken: string, topic?: string, materialType?: string) {
    let url = '/materials';
    const params = [];
    if (topic) params.push(`topic=${encodeURIComponent(topic)}`);
    if (materialType) params.push(`material_type=${encodeURIComponent(materialType)}`);
    if (params.length > 0) url += '?' + params.join('&');

    return this.request<any[]>(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async getMaterial(accessToken: string, materialId: number) {
    return this.request<any>(`/materials/${materialId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async deleteMaterial(accessToken: string, materialId: number) {
    return this.request<any>(`/materials/${materialId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
  // ═══════════════════════════════════════════
  // ATTENDANCE ENDPOINTS
  // ═══════════════════════════════════════════

  async markAttendanceByTrainer(accessToken: string, sessionId: number, traineeIds: number[], status: string = 'PRESENT', notes?: string) {
    return this.request<any>('/attendance/mark-by-trainer', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ session_id: sessionId, trainee_ids: traineeIds, status, notes }),
    });
  }

  async getSessionAttendance(accessToken: string, sessionId: number) {
    return this.request<any[]>(`/attendance/session/${sessionId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async getUserAttendanceHistory(accessToken: string, userId: number) {
    return this.request<any[]>(`/attendance/user/${userId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
  // ═══════════════════════════════════════════
  // FACE ATTENDANCE ENDPOINTS
  // ═══════════════════════════════════════════

  async uploadFaceImageBase64(accessToken: string, base64Image: string) {
    return this.request<any>('/attendance/upload-face-base64', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ image_base64: base64Image }),
    });
  }

  async verifyFaceAndMarkAttendance(accessToken: string, sessionId: number, selfieBase64: string, latitude?: number, longitude?: number) {
    return this.request<any>('/attendance/self', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        session_id: sessionId,
        selfie_base64: selfieBase64,
        latitude: latitude || null,
        longitude: longitude || null,
      }),
    });
  }

  async verifyFaceOnly(accessToken: string, selfieBase64: string) {
    return this.request<any>('/attendance/verify-face', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ selfie_base64: selfieBase64 }),
    });
  }
  // ═══════════════════════════════════════════
  // NOTIFICATIONS ENDPOINTS
  // ═══════════════════════════════════════════

  async getMyNotifications(accessToken: string, unreadOnly: boolean = false) {
    return this.request<any[]>(`/notifications/my-notifications?unread_only=${unreadOnly}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async sendNotifications(accessToken: string, userIds: number[], type: string, title: string, message: string, data?: any) {
    return this.request<any>('/notifications/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ user_ids: userIds, notification_type: type, title, message, data }),
    });
  }

  async markNotificationRead(accessToken: string, notificationId: number) {
    return this.request<any>(`/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async markAllNotificationsRead(accessToken: string) {
    return this.request<any>('/notifications/read-all', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async deleteNotification(accessToken: string, notificationId: number) {
    return this.request<any>(`/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async deleteReadNotifications(accessToken: string) {
    return this.request<any>('/notifications/read-all', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
  // ═══════════════════════════════════════════
  // REPORTING ENDPOINTS
  // ═══════════════════════════════════════════

  async getDashboardStats(accessToken: string) {
    return this.request<any>('/reports/dashboard', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async getAttendanceReport(accessToken: string, sessionId?: number, startDate?: string, endDate?: string) {
    let url = '/reports/attendance?';
    if (sessionId) url += `session_id=${sessionId}&`;
    if (startDate) url += `start_date=${startDate}&`;
    if (endDate) url += `end_date=${endDate}&`;
    
    return this.request<any>(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async getSessionsReport(accessToken: string, trainerId?: number, status?: string) {
    let url = '/reports/sessions?';
    if (trainerId) url += `trainer_id=${trainerId}&`;
    if (status) url += `status=${status}&`;
    
    return this.request<any>(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async getUserPerformanceReport(accessToken: string, userId: number) {
    return this.request<any>(`/reports/performance/${userId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async getTrainerReport(accessToken: string, trainerId?: number) {
    let url = '/reports/trainer?';
    if (trainerId) url += `trainer_id=${trainerId}&`;
    
    return this.request<any>(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async getMonthlyReport(accessToken: string, year?: number) {
    let url = '/reports/monthly?';
    if (year) url += `year=${year}&`;
    
    return this.request<any>(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
  // ═══════════════════════════════════════════
  // CERTIFICATES & USER HISTORY
  // ═══════════════════════════════════════════

  async getUserCertificates(accessToken: string, userId: number) {
    return this.request<any[]>(`/certificates/user/${userId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async generateCertificate(accessToken: string, userId: number, sessionId?: number, courseId?: number) {
    let url = `/certificates/generate?user_id=${userId}`;
    if (sessionId) url += `&session_id=${sessionId}`;
    if (courseId) url += `&course_id=${courseId}`;
    
    return this.request<any>(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async acceptEnrollment(accessToken: string, enrollmentId: number) {
    return this.request<any>(`/enrollments/${enrollmentId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async declineEnrollment(accessToken: string, enrollmentId: number) {
    return this.request<any>(`/enrollments/${enrollmentId}/decline`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async removeEnrollment(accessToken: string, enrollmentId: number) {
    return this.request<any>(`/enrollments/${enrollmentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async getFlashcards(accessToken: string, topic?: string) {
    let url = '/flashcards';
    if (topic) url += `?topic=${encodeURIComponent(topic)}`;
    
    return this.request<any[]>(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async listUsers(accessToken: string, params?: { role?: string; status?: string; search?: string }) {
    let url = '/users';
    const queryParams: string[] = [];
    if (params?.role) queryParams.push(`role=${params.role}`);
    if (params?.status) queryParams.push(`status=${params.status}`);
    if (params?.search) queryParams.push(`search=${encodeURIComponent(params.search)}`);
    if (queryParams.length > 0) url += `?${queryParams.join('&')}`;
    
    return this.request<any[]>(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async createUser(accessToken: string, userData: any) {
    return this.request<any>('/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(userData),
    });
  }

  async updateUser(accessToken: string, userId: number, userData: any) {
    return this.request<any>(`/users/${userId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(accessToken: string, userId: number) {
    return this.request<any>(`/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}

export const api = new ApiService(API_BASE_URL);
export default api;
