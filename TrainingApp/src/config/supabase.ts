/**
 * Supabase Configuration
 * 
 * Centralized Supabase client setup with environment variables.
 * All database operations should use this client instance.
 */

import { createClient } from '@supabase/supabase-js';

// Supabase credentials
export const SUPABASE_URL = 'https://qnndqowtocscumrijjts.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFubmRxb3d0b2NzY3VtcmlqanRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NTI0NjcsImV4cCI6MjA5MTAyODQ2N30.GtOtvoaeWU6tv1X8nrxaVjwgf5S1jroOaUGm7oBJ3a4';

// Create Supabase client with realtime enabled
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database table names (for type safety and consistency)
export const TABLES = {
  USERS: 'users',
  HR_MASTER: 'hr_master_data',
  TRAINING_SESSIONS: 'training_sessions',
  SESSION_ENROLLMENTS: 'session_enrollments',
  ATTENDANCE: 'attendance',
  MATERIALS: 'materials',
  NOTIFICATIONS: 'notifications',
  QUESTION_BANK: 'question_bank',
  ASSESSMENT_SESSIONS: 'assessment_sessions',
  ASSESSMENT_ATTEMPTS: 'assessment_attempts',
  ASSESSMENT_RESULTS: 'assessment_results',
  CERTIFICATES: 'certificates',
  FEEDBACK: 'feedback',
  FLASHCARDS: 'flashcards',
  SYNC_QUEUE: 'sync_queue',
  COURSES: 'courses',
  COURSE_MATERIALS: 'course_materials',
  COURSE_ENROLLMENTS: 'course_enrollments',
  SESSION_MATERIALS: 'session_materials',
  QUIZ_ATTEMPTS: 'quiz_attempts',
  MODULES: 'modules',
} as const;

// User roles
export enum UserRole {
  TRAINEE = 'TRAINEE',
  TRAINER = 'TRAINER',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN',
}

// Session status
export enum SessionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// Enrollment status
export enum EnrollmentStatus {
  INVITED = 'INVITED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  ATTENDED = 'ATTENDED',
  ABSENT = 'ABSENT',
}

// Material types
export enum MaterialType {
  PDF = 'PDF',
  PPT = 'PPT',
  VIDEO = 'VIDEO',
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
}

// Notification types
export enum NotificationType {
  TRAINING_INVITE = 'TRAINING_INVITE',
  REMINDER_24H = 'REMINDER_24H',
  MATERIAL_RELEASED = 'MATERIAL_RELEASED',
  SESSION_CANCELLED = 'SESSION_CANCELLED',
  ASSESSMENT_DUE = 'ASSESSMENT_DUE',
  RESULT_PUBLISHED = 'RESULT_PUBLISHED',
}

// Assessment types
export enum AssessmentType {
  PRE_TEST = 'PRE_TEST',
  POST_TEST = 'POST_TEST',
  RETAKE = 'RETAKE',
}

export default supabase;
