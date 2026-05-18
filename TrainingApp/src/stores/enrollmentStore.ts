/**
 * Enrollment Store — Zustand state management for course enrollments.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import enrollmentService from '../services/enrollmentService';
import { EnrollmentStatus } from '../config/supabase';

interface EnrollmentState {
  enrollments: any[];
  userEnrollments: any[];
  sessionEnrollments: any[];
  enrollmentStats: any | null;
  isLoading: boolean;
  error: string | null;

  fetchEnrollments: (filters?: { sessionId?: number; userId?: number; status?: string }) => Promise<void>;
  fetchUserEnrollments: (userId: number) => Promise<void>;
  fetchSessionEnrollments: (sessionId: number) => Promise<void>;
  fetchEnrollmentStats: (sessionId: number) => Promise<void>;
  enrollUser: (sessionId: number, userId: number) => Promise<boolean>;
  bulkEnroll: (sessionId: number, userIds: number[]) => Promise<boolean>;
  acceptEnrollment: (enrollmentId: number) => Promise<boolean>;
  declineEnrollment: (enrollmentId: number) => Promise<boolean>;
  removeEnrollment: (enrollmentId: number) => Promise<boolean>;
  isUserEnrolled: (sessionId: number, userId: number) => Promise<boolean>;
  clearError: () => void;
}

export const useEnrollmentStore = create<EnrollmentState>()(
  persist(
    (set, get) => ({
  enrollments: [],
  userEnrollments: [],
  sessionEnrollments: [],
  enrollmentStats: null,
  isLoading: false,
  error: null,

  fetchEnrollments: async (filters) => {
    set({ isLoading: true, error: null });
    const result = await enrollmentService.getEnrollments(filters as any);
    if (result.success) {
      set({ enrollments: Array.isArray(result.data) ? result.data : [], isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch enrollments', isLoading: false });
    }
  },

  fetchUserEnrollments: async (userId) => {
    set({ isLoading: true, error: null });
    const result = await enrollmentService.getUserEnrollments(userId);
    if (result.success) {
      set({ userEnrollments: Array.isArray(result.data) ? result.data : [], isLoading: false });
    } else {
      set({ userEnrollments: [], error: result.error || 'Failed to fetch user enrollments', isLoading: false });
    }
  },

  fetchSessionEnrollments: async (sessionId) => {
    set({ isLoading: true, error: null });
    const result = await enrollmentService.getSessionEnrollments(sessionId);
    if (result.success) {
      set({ sessionEnrollments: Array.isArray(result.data) ? result.data : [], isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch session enrollments', isLoading: false });
    }
  },

  fetchEnrollmentStats: async (sessionId) => {
    set({ isLoading: true, error: null });
    const result = await enrollmentService.getEnrollmentStats(sessionId);
    if (result.success) {
      set({ enrollmentStats: result.data, isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch stats', isLoading: false });
    }
  },

  enrollUser: async (sessionId, userId) => {
    set({ isLoading: true, error: null });
    const result = await enrollmentService.enrollUser(sessionId, userId);
    if (result.success) {
      set({ isLoading: false });
      return true;
    } else {
      set({ error: result.error || 'Failed to enroll', isLoading: false });
      return false;
    }
  },

  bulkEnroll: async (sessionId, userIds) => {
    set({ isLoading: true, error: null });
    const result = await enrollmentService.bulkEnroll(sessionId, userIds);
    if (result.success) {
      set({ isLoading: false });
      return true;
    } else {
      set({ error: result.error || 'Bulk enrollment failed', isLoading: false });
      return false;
    }
  },

  acceptEnrollment: async (enrollmentId) => {
    set({ isLoading: true, error: null });
    const result = await enrollmentService.acceptEnrollment(enrollmentId);
    if (result.success) {
      set((state) => ({
        userEnrollments: state.userEnrollments.map((e) =>
          e.id === enrollmentId ? { ...e, status: 'ACCEPTED' } : e
        ),
        isLoading: false,
      }));
      return true;
    } else {
      set({ error: result.error || 'Failed to accept', isLoading: false });
      return false;
    }
  },

  declineEnrollment: async (enrollmentId) => {
    set({ isLoading: true, error: null });
    const result = await enrollmentService.declineEnrollment(enrollmentId);
    if (result.success) {
      set((state) => ({
        userEnrollments: state.userEnrollments.map((e) =>
          e.id === enrollmentId ? { ...e, status: 'DECLINED' } : e
        ),
        isLoading: false,
      }));
      return true;
    } else {
      set({ error: result.error || 'Failed to decline', isLoading: false });
      return false;
    }
  },

  removeEnrollment: async (enrollmentId) => {
    set({ isLoading: true, error: null });
    const result = await enrollmentService.removeEnrollment(enrollmentId);
    if (result.success) {
      set((state) => ({
        userEnrollments: state.userEnrollments.filter((e) => e.id !== enrollmentId),
        isLoading: false,
      }));
      return true;
    } else {
      set({ error: result.error || 'Failed to remove enrollment', isLoading: false });
      return false;
    }
  },

  isUserEnrolled: async (sessionId, userId) => {
    return enrollmentService.isUserEnrolled(sessionId, userId);
  },

  clearError: () => set({ error: null }),
    }),
    {
      name: 'enrollment-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useEnrollmentStore;
