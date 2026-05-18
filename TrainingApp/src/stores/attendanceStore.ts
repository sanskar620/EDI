/**
 * Attendance Store — Zustand state management for attendance.
 */

import { create } from 'zustand';
import attendanceService from '../services/attendanceService';

interface AttendanceState {
  sessionAttendance: any[];
  userHistory: any[];
  currentLocation: { latitude: number; longitude: number; accuracy: number } | null;
  isLoading: boolean;
  error: string | null;

  fetchSessionAttendance: (sessionId: number) => Promise<void>;
  fetchUserHistory: (userId: number) => Promise<void>;
  getCurrentLocation: () => Promise<boolean>;
  markAttendance: (sessionId: number, userId: number, markedBy: number, options?: any) => Promise<boolean>;
  markCheckout: (attendanceId: number) => Promise<boolean>;
  updateAttendance: (attendanceId: number, updates: any) => Promise<boolean>;
  deleteAttendance: (attendanceId: number) => Promise<boolean>;
  validateGeofence: (userLoc: any, geofence: any) => Promise<{ valid: boolean; distance: number }>;
  clearError: () => void;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  sessionAttendance: [],
  userHistory: [],
  currentLocation: null,
  isLoading: false,
  error: null,

  fetchSessionAttendance: async (sessionId) => {
    set({ isLoading: true, error: null });
    const result = await attendanceService.getSessionAttendance(sessionId);
    if (result.success) {
      set({ sessionAttendance: result.data, isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch attendance', isLoading: false });
    }
  },

  fetchUserHistory: async (userId) => {
    set({ isLoading: true, error: null });
    const result = await attendanceService.getUserAttendanceHistory(userId);
    if (result.success) {
      set({ userHistory: result.data, isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch history', isLoading: false });
    }
  },

  getCurrentLocation: async () => {
    set({ isLoading: true, error: null });
    const result = await attendanceService.getCurrentLocation();
    if (result.success) {
      set({ currentLocation: result.data, isLoading: false });
      return true;
    } else {
      set({ error: result.error || 'Failed to get location', isLoading: false });
      return false;
    }
  },

  markAttendance: async (sessionId, userId, markedBy, options) => {
    set({ isLoading: true, error: null });
    const result = await attendanceService.markAttendance(sessionId, userId, markedBy, options);
    if (result.success) {
      // Backend returns a bulk response object, so we just re-fetch the session attendance
      await get().fetchSessionAttendance(sessionId);
      return true;
    } else {
      set({ error: result.error || 'Failed to mark attendance', isLoading: false });
      return false;
    }
  },

  markCheckout: async (attendanceId) => {
    set({ isLoading: true, error: null });
    const result = await attendanceService.markCheckout(attendanceId);
    if (result.success) {
      set((state) => ({
        sessionAttendance: state.sessionAttendance.map((a) =>
          a.id === attendanceId ? { ...a, ...result.data } : a
        ),
        isLoading: false,
      }));
      return true;
    } else {
      set({ error: result.error || 'Failed to mark checkout', isLoading: false });
      return false;
    }
  },

  updateAttendance: async (attendanceId, updates) => {
    set({ isLoading: true, error: null });
    const result = await attendanceService.updateAttendance(attendanceId, updates);
    if (result.success) {
      set((state) => ({
        sessionAttendance: state.sessionAttendance.map((a) =>
          a.id === attendanceId ? { ...a, ...result.data } : a
        ),
        isLoading: false,
      }));
      return true;
    } else {
      set({ error: result.error || 'Failed to update', isLoading: false });
      return false;
    }
  },

  deleteAttendance: async (attendanceId) => {
    set({ isLoading: true, error: null });
    const result = await attendanceService.deleteAttendance(attendanceId);
    if (result.success) {
      set((state) => ({
        sessionAttendance: state.sessionAttendance.filter((a) => a.id !== attendanceId),
        isLoading: false,
      }));
      return true;
    } else {
      set({ error: result.error || 'Failed to delete', isLoading: false });
      return false;
    }
  },

  validateGeofence: async (userLoc, geofence) => {
    return attendanceService.validateGeofence(userLoc, geofence);
  },

  clearError: () => set({ error: null }),
}));

export default useAttendanceStore;
