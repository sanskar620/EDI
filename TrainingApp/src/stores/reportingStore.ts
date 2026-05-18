/**
 * Reporting Store — Zustand state management for reports and analytics.
 */

import { create } from 'zustand';
import reportingService from '../services/reportingService';

interface ReportingState {
  dashboardStats: any | null;
  sessionReport: any | null;
  attendanceReport: any | null;
  trainerReport: any | null;
  userPerformance: any | null;
  monthlyReport: any | null;
  isLoading: boolean;
  error: string | null;

  fetchDashboardStats: () => Promise<void>;
  fetchSessionReport: (sessionId: number) => Promise<void>;
  fetchAttendanceReport: (sessionId: number) => Promise<void>;
  fetchTrainerReport: (trainerId: number) => Promise<void>;
  fetchUserPerformance: (userId: number) => Promise<void>;
  fetchMonthlyReport: (year: number, month: number) => Promise<void>;
  clearError: () => void;
}

export const useReportingStore = create<ReportingState>((set, get) => ({
  dashboardStats: null,
  sessionReport: null,
  attendanceReport: null,
  trainerReport: null,
  userPerformance: null,
  monthlyReport: null,
  isLoading: false,
  error: null,

  fetchDashboardStats: async () => {
    set({ isLoading: true, error: null });
    const result = await reportingService.getDashboardStats();
    if (result.success) {
      set({ dashboardStats: result.data, isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch dashboard stats', isLoading: false });
    }
  },

  fetchSessionReport: async (sessionId) => {
    set({ isLoading: true, error: null });
    const result = await reportingService.getSessionReport(sessionId);
    if (result.success) {
      set({ sessionReport: result.data, isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch session report', isLoading: false });
    }
  },

  fetchAttendanceReport: async (sessionId) => {
    set({ isLoading: true, error: null });
    const result = await reportingService.getAttendanceReport(sessionId);
    if (result.success) {
      set({ attendanceReport: result.data, isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch attendance report', isLoading: false });
    }
  },

  fetchTrainerReport: async (trainerId) => {
    set({ isLoading: true, error: null });
    const result = await reportingService.getTrainerReport(trainerId);
    if (result.success) {
      set({ trainerReport: result.data, isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch trainer report', isLoading: false });
    }
  },

  fetchUserPerformance: async (userId) => {
    set({ isLoading: true, error: null });
    const result = await reportingService.getUserPerformanceReport(userId);
    if (result.success) {
      set({ userPerformance: result.data, isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch user performance', isLoading: false });
    }
  },

  fetchMonthlyReport: async (year, month) => {
    set({ isLoading: true, error: null });
    const result = await reportingService.getMonthlyReport(year, month);
    if (result.success) {
      set({ monthlyReport: result.data, isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch monthly report', isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

export default useReportingStore;
