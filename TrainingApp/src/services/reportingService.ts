/**
 * Reporting & Analytics Service
 * 
 * Generates reports and analytics for training program.
 * Role-based access: Supervisors and Admins can view all, Trainers see their data only.
 */

import api from './api';
import authService from './authService';

export interface ServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class ReportingService {
  private getToken() {
    const token = authService.getAuthToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  }

  /**
   * Get attendance report for a session
   */
  async getAttendanceReport(sessionId: number): Promise<ServiceResponse> {
    try {
      // The backend /reports/attendance returns attendance stats. 
      // But we might need session, enrollments and attendance lists for the frontend UI.
      // We can fetch from individual endpoints since we replaced supabase queries here.
      const sessionResponse = await api.getSession(this.getToken(), sessionId);
      const attendanceResponse = await api.getSessionAttendance(this.getToken(), sessionId);
      const enrollmentsResponse = await api.getSessionEnrollments(this.getToken(), sessionId);

      const enrollmentsData = Array.isArray(enrollmentsResponse?.data) ? enrollmentsResponse.data : [];
      const attendanceData = Array.isArray(attendanceResponse?.data) ? attendanceResponse.data : [];
      const sessionData = sessionResponse?.data || sessionResponse;

      const totalEnrolled = enrollmentsData.length;
      const totalPresent = attendanceData.length;
      
      const attendanceRate = totalEnrolled > 0 ? (totalPresent / totalEnrolled) * 100 : 0;

      return {
        success: true,
        data: {
          session_id: sessionId,
          session_title: sessionData?.title,
          trainer: sessionData?.trainer?.full_name || 'Trainer',
          scheduled_date: sessionData?.scheduled_date,
          total_enrolled: totalEnrolled,
          total_present: totalPresent,
          total_absent: totalEnrolled - totalPresent,
          attendance_rate: attendanceRate.toFixed(2),
          attendance_records: attendanceData,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to generate attendance report',
      };
    }
  }

  /**
   * Get session completion report
   */
  async getSessionReport(sessionId: number): Promise<ServiceResponse> {
    try {
      const session = await api.getSession(this.getToken(), sessionId);
      const enrollments = await api.getSessionEnrollments(this.getToken(), sessionId);
      
      const sessionData = session?.data || session;
      const enrollmentsData = Array.isArray(enrollments?.data) ? enrollments.data : [];
      
      const enrollmentStats = {
        total: enrollmentsData.length,
        accepted: enrollmentsData.filter((e: any) => e.status === 'ACCEPTED').length,
        declined: enrollmentsData.filter((e: any) => e.status === 'DECLINED').length,
        attended: enrollmentsData.filter((e: any) => e.status === 'ATTENDED').length,
        absent: enrollmentsData.filter((e: any) => e.status === 'ABSENT').length,
      };

      // Mocked materials count until backend endpoint is made
      const materialsCount = 0; 
      
      // Call the new reports endpoint
      const sessionsReport = await api.getSessionsReport(this.getToken());
      const reportData = Array.isArray(sessionsReport?.data) ? sessionsReport.data : [];
      const report = reportData.find((s: any) => s.session_id === sessionId);

      return {
        success: true,
        data: {
          session: sessionData,
          enrollment_stats: enrollmentStats,
          materials_count: materialsCount,
          assessment_stats: {
            total_attempts: report?.assessments_taken || 0,
            average_score: '0.00', // Backend doesn't return average score yet in that endpoint
            pass_rate: report?.pass_rate?.toFixed(2) || '0.00',
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to generate session report',
      };
    }
  }

  /**
   * Get performance report for a user
   */
  async getUserPerformanceReport(userId: number): Promise<ServiceResponse> {
    try {
      const reportResp = await api.getUserPerformanceReport(this.getToken(), userId);
      
      // Backend returns: { data: { user, summary, attendance_history, enrolled_courses } }
      // api.ts request() wraps in { success, data } so reportResp.data = { data: { ... } }
      // Unwrap both layers
      const outer = reportResp?.data;
      const inner = outer?.data ?? outer; // handles single or double nesting
      
      const user = inner?.user || {};
      const summary = inner?.summary || {};
      const attendanceHistory = inner?.attendance_history || [];
      const enrolledCourses = inner?.enrolled_courses || [];

      return {
        success: true,
        data: {
          user: {
            id: user?.id,
            employee_id: user?.employee_id,
            full_name: user?.full_name,
            department: user?.department || 'N/A',
          },
          summary: {
            total_sessions_enrolled: summary?.total_sessions_enrolled || 0,
            total_sessions_attended: summary?.total_sessions_attended || 0,
            attendance_rate: summary?.attendance_rate || 0,
            total_assessments: summary?.total_assessments || 0,
            assessments_passed: summary?.assessments_passed || 0,
            average_score: summary?.average_score || 0,
            certificates_earned: summary?.certificates_earned || 0,
          },
          attendance_history: attendanceHistory,
          enrolled_courses: enrolledCourses,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to generate performance report',
      };
    }
  }


  /**
   * Get trainer activity report
   */
  async getTrainerReport(trainerId: number): Promise<ServiceResponse> {
    try {
      const reportResp = await api.getTrainerReport(this.getToken(), trainerId);
      const report = reportResp?.data || reportResp;
      
      return {
        success: true,
        data: {
          trainer: {
            id: report?.trainer_id,
            full_name: report?.full_name,
          },
          summary: {
            total_sessions: report?.total_sessions_created || 0,
            completed_sessions: report?.sessions_completed || 0,
            ongoing_sessions: (report?.total_sessions_created || 0) - (report?.sessions_completed || 0),
            total_trainees_trained: report?.total_trainees_taught || 0,
            materials_uploaded: 0,
          },
          sessions: [],
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to generate trainer report',
      };
    }
  }

  /**
   * Get overall dashboard statistics (Supervisor/Admin)
   */
  async getDashboardStats(): Promise<ServiceResponse> {
    try {
      const statsResp = await api.getDashboardStats(this.getToken());
      const stats = statsResp?.data || statsResp || {};
      
      return {
        success: true,
        data: {
          user_stats: {
            total: stats?.total_trainees || 0,
            active: stats?.total_trainees || 0,
            trainees: stats?.total_trainees || 0,
            trainers: 0,
            supervisors: 0,
          },
          session_stats: {
            total: stats?.total_sessions || 0,
            published: (stats?.total_sessions || 0) - (stats?.completed_sessions || 0),
            ongoing: (stats?.total_sessions || 0) - (stats?.completed_sessions || 0),
            completed: stats?.completed_sessions || 0,
          },
          attendance_today: 0,
          materials_count: 0,
          certificates_issued: 0,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch dashboard stats',
      };
    }
  }

  /**
   * Get monthly training report
   */
  async getMonthlyReport(year: number, month: number): Promise<ServiceResponse> {
    try {
      const reportResp = await api.getMonthlyReport(this.getToken(), year);
      const report = reportResp?.data || reportResp || {};
      
      const monthlyData = Array.isArray(report?.monthly_data) ? report.monthly_data : [];
      const monthData = monthlyData.find((m: any) => m.month_num === month);
      
      return {
        success: true,
        data: {
          period: { year, month },
          sessions: {
            total: monthData?.sessions_count || 0,
            completed: monthData?.sessions_count || 0, // Mocked for now
          },
          attendance: {
            total_check_ins: 0,
          },
          assessments: {
            total: 0,
            average_score: '0.00',
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to generate monthly report',
      };
    }
  }
}

export default new ReportingService();
