import api from './api';
import authService from './authService';

class CertificateService {
  private getToken() {
    const token = authService.getAuthToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  }

  async getUserCertificates(userId: number) {
    try {
      const response = await api.getUserCertificates(this.getToken(), userId);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch certificates',
      };
    }
  }

  async generateCertificate(userId: number, sessionId?: number, courseId?: number) {
    try {
      const response = await api.generateCertificate(this.getToken(), userId, sessionId, courseId);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to generate certificate',
      };
    }
  }
}

export default new CertificateService();
