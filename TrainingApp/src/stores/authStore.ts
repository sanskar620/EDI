/**
 * Auth Store — Manages authentication state using Supabase authService.
 * Single source of truth for user identity across the app.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/authService';
import type { User } from '../services/authService';
import { UserRole } from '../config/supabase';
import userService from '../services/userService';

interface AuthState {
  // State
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Temp state for login flow
  tempEmployeeId: string;
  tempMobileNumber: string;
  tempFullName: string;
  requiresFaceVerification: boolean;
  requiresDeviceBinding: boolean;

  // Computed-like properties
  needsFaceOnboarding: boolean;

  // Actions
  setTempCredentials: (employeeId: string, mobileNumber: string, fullName: string) => void;
  setOtpResult: (requiresFace: boolean, requiresDevice: boolean) => void;
  verifyIdentity: (employeeId: string, mobileNumber: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  sendOTP: (employeeId: string, mobileNumber: string) => Promise<{ success: boolean; error?: string }>;
  verifyOTP: (employeeId: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  login: (employeeId: string, deviceId: string, deviceModel?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<boolean>;
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
  completeFaceOnboarding: (faceImageUrl: string) => void;
  getUserById: (userId: number) => Promise<any>;
  getAllUsers: (filters?: { role?: UserRole; status?: string; search?: string }) => Promise<any[]>;
  createUser: (userData: Partial<User>) => Promise<boolean>;
  deleteUser: (userId: number) => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,

  tempEmployeeId: '',
  tempMobileNumber: '',
  tempFullName: '',
  requiresFaceVerification: false,
  requiresDeviceBinding: false,

  // Computed: User needs face onboarding if logged in but no profile_photo_url
  get needsFaceOnboarding() {
    const { user, isAuthenticated } = get();
    return isAuthenticated && user != null && !user.profile_photo_url;
  },

  setTempCredentials: (employeeId, mobileNumber, fullName) => {
    set({
      tempEmployeeId: employeeId,
      tempMobileNumber: mobileNumber,
      tempFullName: fullName,
    });
  },

  setOtpResult: (requiresFace, requiresDevice) => {
    set({
      requiresFaceVerification: requiresFace,
      requiresDeviceBinding: requiresDevice,
    });
  },

  verifyIdentity: async (employeeId, mobileNumber) => {
    set({ isLoading: true, error: null });
    const result = await authService.verifyIdentity(employeeId, mobileNumber);
    set({ isLoading: false });
    if (!result.success) {
      set({ error: result.error });
    }
    return result;
  },

  sendOTP: async (employeeId, mobileNumber) => {
    set({ isLoading: true, error: null });
    const result = await authService.sendOTP(employeeId, mobileNumber);
    set({ isLoading: false });
    if (!result.success) {
      set({ error: result.error });
    }
    return result;
  },

  verifyOTP: async (employeeId, otp) => {
    set({ isLoading: true, error: null });
    const result = await authService.verifyOTP(employeeId, otp);
    set({ isLoading: false });
    if (!result.success) {
      set({ error: result.error });
    }
    return result;
  },

  login: async (employeeId, deviceId, deviceModel) => {
    set({ isLoading: true, error: null });
    const result = await authService.login(employeeId, deviceId, deviceModel);
    if (result.success && result.data) {
      set({
        user: result.data,
        isAuthenticated: true,
        isLoading: false,
        tempEmployeeId: '',
        tempMobileNumber: '',
        tempFullName: '',
      });
      return { success: true };
    } else {
      set({ error: result.error || 'Login failed', isLoading: false });
      return { success: false, error: result.error };
    }
  },

  logout: async () => {
    await authService.logout();
    await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user', 'current_user']);
    set({
      user: null,
      isAuthenticated: false,
      tempEmployeeId: '',
      tempMobileNumber: '',
      tempFullName: '',
    });
  },

  loadStoredAuth: async () => {
    try {
      set({ isLoading: true });
      const user = await authService.getCurrentUser();
      if (user) {
        set({ user, isAuthenticated: true, isLoading: false });
        return true;
      }
      set({ isLoading: false });
      return false;
    } catch (error) {
      console.error('Failed to load stored auth:', error);
      set({ isLoading: false });
      return false;
    }
  },

  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) return false;
    set({ isLoading: true, error: null });
    const result = await authService.updateProfile(user.id, updates);
    if (result.success) {
      set({ user: result.data, isLoading: false });
      return true;
    } else {
      set({ error: result.error || 'Failed to update profile', isLoading: false });
      return false;
    }
  },

  completeFaceOnboarding: (faceImageUrl) => {
    const { user } = get();
    if (user) {
      set({
        user: { ...user, profile_photo_url: faceImageUrl }
      });
    }
  },

  getUserById: async (userId) => {
    // userService doesn't have a direct getUserById right now, just mock or use listUsers filtering
    // In a real app we'd add getUserById to userService, for now return null as it's not heavily used
    return null;
  },

  getAllUsers: async (filters) => {
    set({ isLoading: true, error: null });
    const result = await userService.listUsers(filters as any);
    set({ isLoading: false });
    return result.success ? result.data : [];
  },

  createUser: async (userData) => {
    set({ isLoading: true, error: null });
    const result = await userService.createUser(userData as any);
    set({ isLoading: false });
    if (!result.success) {
      set({ error: result.error || 'Failed to create user' });
    }
    return result.success;
  },

  deleteUser: async (userId) => {
    set({ isLoading: true, error: null });
    const result = await userService.deleteUser(userId);
    set({ isLoading: false });
    if (!result.success) {
      set({ error: result.error || 'Failed to delete user' });
    }
    return result.success;
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
