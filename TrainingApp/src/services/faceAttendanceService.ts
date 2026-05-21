/**
 * Face Attendance Service
 * 
 * Handles face-based attendance with FastAPI Backend integration.
 */

import api from './api';
import authService from './authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FaceUploadResponse {
  success: boolean;
  message: string;
  face_image_url?: string;
  presigned_url?: string;
}

export interface FaceVerifyResponse {
  success: boolean;
  is_match: boolean;
  similarity: number;
  message: string;
  attendance_id?: number;
  selfie_url?: string;
}

export interface TrainerMarkResponse {
  success: boolean;
  marked_count: number;
  failed_count: number;
  details: any[];
}

export interface AttendanceRecord {
  id: number;
  session_id: number;
  user_id: number;
  status: string;
  method: string;
  check_in_time?: string;
  geo_verified: boolean;
  face_match_score?: number;
  selfie_url?: string;
  marked_by?: number;
}

class FaceAttendanceService {
  private getToken() {
    const token = authService.getAuthToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  }

  // ═══════════════════════════════════════════
  // FACE ONBOARDING
  // ═══════════════════════════════════════════

  /**
   * Upload face image during onboarding
   */
  async uploadFaceImage(base64Image: string): Promise<FaceUploadResponse> {
    try {
      console.log('[FaceAttendance] Starting face image upload via Backend...');
      const apiResponse: any = await api.uploadFaceImageBase64(this.getToken(), base64Image);
      
      // api.ts returns { success: true, data: { ... } }
      const response = apiResponse.success && apiResponse.data ? apiResponse.data : apiResponse;
      
      if (response.success && response.face_image_url) {
        // Update local storage so the app state stays in sync
        const userJson = await AsyncStorage.getItem('current_user');
        if (userJson) {
          const currentUser = JSON.parse(userJson);
          currentUser.profile_photo_url = response.face_image_url;
          await AsyncStorage.setItem('current_user', JSON.stringify(currentUser));
        }
      }
      return response;
    } catch (error: any) {
      console.error('[FaceAttendance] Upload error:', error);
      return {
        success: false,
        message: error.message || 'Failed to upload face image',
      };
    }
  }

  /**
   * Check if user has registered their face
   */
  async hasRegisteredFace(userId: number): Promise<boolean> {
    try {
      // Check from local storage first to save API calls
      const userJson = await AsyncStorage.getItem('current_user');
      if (userJson) {
        const currentUser = JSON.parse(userJson);
        if (currentUser.id === userId && currentUser.profile_photo_url) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('[FaceAttendance] Check face error:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════
  // FACE VERIFICATION ATTENDANCE
  // ═══════════════════════════════════════════

  /**
   * Verify face and mark attendance (trainee self check-in)
   */
  async verifyFaceAndMarkAttendance(
    sessionId: number,
    selfieBase64: string,
    latitude?: number,
    longitude?: number
  ): Promise<FaceVerifyResponse> {
    try {
      console.log('[FaceAttendance] Starting face verification for session:', sessionId);
      
      const apiResponse = await api.verifyFaceAndMarkAttendance(
        this.getToken(),
        sessionId,
        selfieBase64,
        latitude,
        longitude
      ) as any;

      return apiResponse.success && apiResponse.data ? apiResponse.data : apiResponse;
    } catch (error: any) {
      console.error('[FaceAttendance] Verification error:', error);
      return {
        success: false,
        is_match: false,
        similarity: 0,
        message: error.message || 'Face verification failed',
      };
    }
  }

  /**
   * Just verify face (without marking attendance)
   */
  async verifyFaceOnly(selfieBase64: string): Promise<FaceVerifyResponse> {
    try {
      const apiResponse = await api.verifyFaceOnly(this.getToken(), selfieBase64) as any;
      return apiResponse.success && apiResponse.data ? apiResponse.data : apiResponse;
    } catch (error: any) {
      console.log('[FaceAttendance] Backend unavailable or verifyFaceOnly failed:', error.message);
      return {
        success: false,
        is_match: false,
        similarity: 0,
        message: 'Face verification server is currently unreachable.',
      };
    }
  }

  // ═══════════════════════════════════════════
  // TRAINER ATTENDANCE MARKING
  // ═══════════════════════════════════════════

  /**
   * Trainer marks attendance for multiple trainees
   */
  async trainerMarkAttendance(
    sessionId: number,
    traineeIds: number[],
    status: 'PRESENT' | 'ABSENT' = 'PRESENT',
    notes?: string
  ): Promise<TrainerMarkResponse> {
    try {
      const apiResponse = await api.markAttendanceByTrainer(
        this.getToken(),
        sessionId,
        traineeIds,
        status,
        notes
      ) as any;
      return apiResponse.success && apiResponse.data ? apiResponse.data : apiResponse;
    } catch (error: any) {
      console.error('[FaceAttendance] Trainer mark error:', error);
      return {
        success: false,
        marked_count: 0,
        failed_count: traineeIds.length,
        details: traineeIds.map(id => ({ user_id: id, error: error.message })),
      };
    }
  }

  // ═══════════════════════════════════════════
  // ATTENDANCE REPORTS
  // ═══════════════════════════════════════════

  /**
   * Get attendance report for a session
   */
  async getSessionAttendance(sessionId: number): Promise<AttendanceRecord[]> {
    try {
      const response = await api.getSessionAttendance(this.getToken(), sessionId);
      if (response.success) {
        return response.data as any[];
      }
      return [];
    } catch (error) {
      console.error('[FaceAttendance] Get attendance exception:', error);
      return [];
    }
  }

  /**
   * Get user's attendance history
   */
  async getUserAttendanceHistory(userId: number): Promise<AttendanceRecord[]> {
    try {
      const response = await api.getUserAttendanceHistory(this.getToken(), userId);
      if (response.success) {
        return response.data as any[];
      }
      return [];
    } catch (error) {
      console.error('[FaceAttendance] Get history exception:', error);
      return [];
    }
  }

  /**
   * Check if user already has attendance for a session
   */
  async hasExistingAttendance(sessionId: number, userId: number): Promise<boolean> {
    try {
      const history = await this.getUserAttendanceHistory(userId);
      return history.some(record => record.session_id === sessionId);
    } catch {
      return false;
    }
  }
}

export default new FaceAttendanceService();
