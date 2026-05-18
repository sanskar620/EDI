/**
 * Services Index
 * 
 * Central export point for all service modules.
 * Import services from this file for consistency.
 */

export { default as authService } from './authService';
export { default as sessionsService } from './sessionsService';
export { default as attendanceService } from './attendanceService';
export { default as materialsService } from './materialsService';
export { default as enrollmentService } from './enrollmentService';
export { default as notificationsService } from './notificationsService';
export { default as assessmentsService } from './assessmentsService';
export { default as reportingService } from './reportingService';

// Re-export types
export type { User, AuthResponse } from './authService';
export type { TrainingSession, SessionWithTrainer, ServiceResponse as SessionServiceResponse } from './sessionsService';
export type { Attendance, GeofenceLocation, ServiceResponse as AttendanceServiceResponse } from './attendanceService';
export type { Material, ServiceResponse as MaterialsServiceResponse } from './materialsService';
export type { Enrollment, EnrollmentWithDetails, ServiceResponse as EnrollmentServiceResponse } from './enrollmentService';
export type { Notification, ServiceResponse as NotificationsServiceResponse } from './notificationsService';
export type {
  Question,
  AssessmentSession,
  AssessmentAttempt,
  AssessmentResult,
  ServiceResponse as AssessmentsServiceResponse,
} from './assessmentsService';
export type { ServiceResponse as ReportingServiceResponse } from './reportingService';
