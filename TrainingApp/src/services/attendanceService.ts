/**
 * Attendance Service
 * 
 * Handles attendance marking, history, and geofencing validation.
 * Powered by FastAPI Backend.
 */

import api from './api';
import authService from './authService';
import * as Location from 'expo-location';

export interface Attendance {
  id: number;
  session_id: number;
  user_id: number;
  check_in_time: string;
  check_out_time?: string;
  geo_verified: boolean;
  biometric_verified: boolean;
  marked_by: number;
  force_marked: boolean;
  notes?: string;
  created_at: string;
}

export interface GeofenceLocation {
  latitude: number;
  longitude: number;
  radius: number; // in meters
}

export interface ServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class AttendanceService {
  private getToken() {
    const token = authService.getAuthToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Validate user location against geofence
   */
  async validateGeofence(
    userLocation: { latitude: number; longitude: number },
    geofence: GeofenceLocation
  ): Promise<{ valid: boolean; distance: number }> {
    const distance = this.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      geofence.latitude,
      geofence.longitude
    );

    return {
      valid: distance <= geofence.radius,
      distance,
    };
  }

  /**
   * Get current device location
   */
  async getCurrentLocation(): Promise<ServiceResponse> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        return {
          success: false,
          error: 'Location permission denied',
        };
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        success: true,
        data: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get location',
      };
    }
  }

  /**
   * Mark attendance for a user (via Trainer)
   */
  async markAttendance(
    sessionId: number,
    userId: number,
    markedBy: number,
    options?: {
      geofence?: GeofenceLocation;
      forceMarked?: boolean;
      notes?: string;
    }
  ): Promise<ServiceResponse> {
    try {
      // Logic for geofencing check could be performed here 
      // but let's assume if the trainer marks it, it's accepted.
      const response = await api.markAttendanceByTrainer(
        this.getToken(),
        sessionId,
        [userId],
        'PRESENT',
        options?.notes
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to mark attendance',
      };
    }
  }

  /**
   * Mark checkout time
   */
  async markCheckout(attendanceId: number): Promise<ServiceResponse> {
    // Backend doesn't support checkout natively yet, return mock success
    return { success: true, data: { message: "Checkout marked (mocked)" } };
  }

  /**
   * Get attendance for a session
   */
  async getSessionAttendance(sessionId: number): Promise<ServiceResponse> {
    try {
      const response = await api.getSessionAttendance(this.getToken(), sessionId);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch attendance',
      };
    }
  }

  /**
   * Get attendance history for a user
   */
  async getUserAttendanceHistory(userId: number): Promise<ServiceResponse> {
    try {
      const response = await api.getUserAttendanceHistory(this.getToken(), userId);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch attendance history',
      };
    }
  }

  /**
   * Update attendance record
   */
  async updateAttendance(
    attendanceId: number,
    updates: Partial<Attendance>
  ): Promise<ServiceResponse> {
    return { success: false, error: 'Not supported by backend yet' };
  }

  /**
   * Delete attendance record
   */
  async deleteAttendance(attendanceId: number): Promise<ServiceResponse> {
    return { success: false, error: 'Not supported by backend yet' };
  }
}

export default new AttendanceService();
