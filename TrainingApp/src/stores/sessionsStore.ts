/**
 * Sessions Store — Zustand state management for training sessions.
 * All UI components read from this store, never from the service directly.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import sessionsService from '../services/sessionsService';
import { SessionStatus, UserRole } from '../config/supabase';

interface SessionsState {
  sessions: any[];
  currentSession: any | null;
  enrollments: any[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSessions: (filters?: { status?: string; trainerId?: number; role?: string; currentUserId?: number }) => Promise<void>;
  fetchSessionById: (id: number) => Promise<void>;
  fetchUserSessions: (userId: number) => Promise<void>;
  fetchUpcomingSessions: (limit?: number) => Promise<void>;
  fetchSessionEnrollments: (sessionId: number) => Promise<void>;
  createSession: (data: any) => Promise<boolean>;
  updateSession: (id: number, data: any) => Promise<boolean>;
  deleteSession: (id: number) => Promise<boolean>;
  publishSession: (id: number) => Promise<boolean>;
  clearError: () => void;
}

export const useSessionsStore = create<SessionsState>()(
  persist(
    (set, get) => ({
  sessions: [],
  currentSession: null,
  enrollments: [],
  isLoading: false,
  error: null,

  fetchSessions: async (filters) => {
    set({ isLoading: true, error: null });
    const result = await sessionsService.getSessions(filters as any);
    if (result.success) {
      set({ sessions: Array.isArray(result.data) ? result.data : [], isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch sessions', isLoading: false });
    }
  },

  fetchSessionById: async (id) => {
    set({ isLoading: true, error: null });
    const result = await sessionsService.getSessionById(id);
    if (result.success) {
      set({ currentSession: result.data || null, isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch session', isLoading: false });
    }
  },

  fetchUserSessions: async (userId) => {
    set({ isLoading: true, error: null });
    const result = await sessionsService.getUserSessions(userId);
    if (result.success) {
      set({ sessions: Array.isArray(result.data) ? result.data : [], isLoading: false });
    } else {
      set({ sessions: [], error: result.error || 'Failed to fetch user sessions', isLoading: false });
    }
  },

  fetchUpcomingSessions: async (limit = 10) => {
    set({ isLoading: true, error: null });
    const result = await sessionsService.getUpcomingSessions(limit);
    if (result.success) {
      set({ sessions: Array.isArray(result.data) ? result.data : [], isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch upcoming sessions', isLoading: false });
    }
  },

  fetchSessionEnrollments: async (sessionId) => {
    set({ isLoading: true, error: null });
    const result = await sessionsService.getSessionEnrollments(sessionId);
    if (result.success) {
      set({ enrollments: Array.isArray(result.data) ? result.data : [], isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch enrollments', isLoading: false });
    }
  },

  createSession: async (data) => {
    set({ isLoading: true, error: null });
    const result = await sessionsService.createSession(data);
    if (result.success) {
      set((state) => ({ sessions: [result.data, ...state.sessions], isLoading: false }));
      return true;
    } else {
      set({ error: result.error || 'Failed to create session', isLoading: false });
      return false;
    }
  },

  updateSession: async (id, data) => {
    set({ isLoading: true, error: null });
    const result = await sessionsService.updateSession(id, data);
    if (result.success) {
      set((state) => ({
        sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...result.data } : s)),
        currentSession: state.currentSession?.id === id ? { ...state.currentSession, ...result.data } : state.currentSession,
        isLoading: false,
      }));
      return true;
    } else {
      set({ error: result.error || 'Failed to update session', isLoading: false });
      return false;
    }
  },

  deleteSession: async (id) => {
    set({ isLoading: true, error: null });
    const result = await sessionsService.deleteSession(id);
    if (result.success) {
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
        isLoading: false,
      }));
      return true;
    } else {
      set({ error: result.error || 'Failed to delete session', isLoading: false });
      return false;
    }
  },

  publishSession: async (id) => {
    set({ isLoading: true, error: null });
    const result = await sessionsService.publishSession(id);
    if (result.success) {
      set((state) => ({
        sessions: state.sessions.map((s) => (s.id === id ? { ...s, status: 'PUBLISHED' } : s)),
        isLoading: false,
      }));
      return true;
    } else {
      set({ error: result.error || 'Failed to publish session', isLoading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
    }),
    {
      name: 'sessions-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useSessionsStore;
