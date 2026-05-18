/**
 * Authentication Service
 * 
 * Handles all authentication and user management operations.
 * Now powered entirely by the FastAPI Python Backend via HTTP requests.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export type UserRole = 'TRAINEE' | 'TRAINER' | 'SUPERVISOR' | 'ADMIN';

export interface User {
  id: number;
  employee_id: string;
  full_name: string;
  email?: string;
  mobile_number: string;
  department?: string;
  designation?: string;
  role: UserRole;
  status: string;
  device_id?: string;
  device_model?: string;
  face_embedding?: string;
  profile_photo_url?: string;
  created_at: string;
  updated_at?: string;
  last_login_at?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class AuthService {
  private currentUser: User | null = null;
  private accessToken: string | null = null;

  /**
   * Verify employee identity with HR master data
   */
  async verifyIdentity(employeeId: string, mobileNumber: string): Promise<AuthResponse> {
    try {
      console.log('[AuthService] verifyIdentity called with:', employeeId, mobileNumber);
      
      const response = await api.verifyIdentity(employeeId, mobileNumber);
      
      if (response.error || !response.data?.success) {
        return {
          success: false,
          error: response.error || 'Employee not found or mobile number mismatch',
        };
      }

      return {
        success: true,
        data: {
          employee_id: employeeId,
          full_name: response.data.full_name,
          role: response.data.role || undefined, // Real role from backend
        },
      };
    } catch (error: any) {
      console.log('[AuthService] verifyIdentity error:', error);
      return {
        success: false,
        error: error.message || 'Identity verification failed',
      };
    }
  }

  /**
   * Send OTP to mobile number via Python Backend
   */
  async sendOTP(employeeId: string, mobileNumber: string): Promise<AuthResponse> {
    try {
      console.log(`[AuthService] Requesting backend to send OTP...`);

      const response = await api.sendOtp(employeeId, mobileNumber);
      
      if (response.error || !response.data?.success) {
        return {
          success: false,
          error: response.error || 'Failed to send SMS',
        };
      }

      return {
        success: true,
        data: { message: 'OTP sent successfully' },
      };
    } catch (error: any) {
      console.error('[AuthService] sendOTP error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send OTP',
      };
    }
  }

  /**
   * Verify OTP via Python Backend
   */
  async verifyOTP(employeeId: string, otp: string): Promise<AuthResponse> {
    try {
      const response = await api.verifyOtp(employeeId, otp);
      
      if (response.error || !response.data?.success) {
        return {
          success: false,
          error: response.error || 'OTP verification failed',
        };
      }
      
      return {
        success: true,
        data: { message: 'OTP verified successfully' },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'OTP verification failed',
      };
    }
  }

  /**
   * Login or bind device via Python Backend
   */
  async login(
    employeeId: string,
    deviceId: string,
    deviceModel?: string
  ): Promise<AuthResponse> {
    try {
      // Use the single bind-device endpoint which creates/updates the user
      // and returns the JWT token all at once
      const response = await api.bindDevice(employeeId, deviceId, deviceModel || 'Unknown');
      
      if (response.error || !response.data?.access_token) {
        return {
          success: false,
          error: response.error || 'Login failed',
        };
      }

      const tokenData = response.data;
      
      // Save JWT tokens
      this.accessToken = tokenData.access_token;
      await AsyncStorage.setItem('auth_token', tokenData.access_token);
      await AsyncStorage.setItem('refresh_token', tokenData.refresh_token);
      
      // Fetch full user profile with the new token
      const profileResponse = await api.getProfile(tokenData.access_token);
      
      if (profileResponse.error || !profileResponse.data) {
        // Fallback user data if profile fetch fails
        const fallbackUser = {
          id: tokenData.user_id,
          employee_id: tokenData.employee_id,
          full_name: tokenData.full_name,
          role: tokenData.role as UserRole,
          status: 'ACTIVE',
          mobile_number: '', // We don't have this in token, but API me has it
          created_at: new Date().toISOString()
        };
        this.currentUser = fallbackUser;
        await AsyncStorage.setItem('current_user', JSON.stringify(fallbackUser));
        return { success: true, data: fallbackUser };
      }

      this.currentUser = profileResponse.data as any;
      await AsyncStorage.setItem('current_user', JSON.stringify(profileResponse.data));

      return {
        success: true,
        data: profileResponse.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }
  }

  /**
   * Get current logged-in user
   */
  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const userData = await AsyncStorage.getItem('current_user');
      const token = await AsyncStorage.getItem('auth_token');
      
      if (token) {
        this.accessToken = token;
      }

      if (userData) {
        this.currentUser = JSON.parse(userData);
        return this.currentUser;
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }

    return null;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      this.currentUser = null;
      this.accessToken = null;
      await AsyncStorage.removeItem('current_user');
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('refresh_token');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  /**
   * Update user profile (Mocked until we build the update endpoint)
   */
  async updateProfile(userId: number, updates: Partial<User>): Promise<AuthResponse> {
    // Currently no API endpoint for updating users yet from frontend,
    // so we just return success and mock it locally
    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = { ...this.currentUser, ...updates };
      await AsyncStorage.setItem('current_user', JSON.stringify(this.currentUser));
    }

    return {
      success: true,
      data: this.currentUser
    };
  }

  /**
   * Get auth token
   */
  getAuthToken(): string | null {
    return this.accessToken;
  }
}

export const authService = new AuthService();
export default authService;
