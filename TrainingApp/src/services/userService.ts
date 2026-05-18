import api from './api';
import authService from './authService';

interface ServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class UserService {
  private getToken() {
    const token = authService.getAuthToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  }

  async listUsers(params?: { role?: string; status?: string; search?: string }): Promise<ServiceResponse> {
    try {
      const response = await api.listUsers(this.getToken(), params);
      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async createUser(userData: {
    employee_id: string;
    full_name: string;
    mobile_number: string;
    role: string;
    department?: string;
    designation?: string;
  }): Promise<ServiceResponse> {
    try {
      const response = await api.createUser(this.getToken(), userData);
      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateUser(userId: number, userData: any): Promise<ServiceResponse> {
    try {
      const response = await api.updateUser(this.getToken(), userId, userData);
      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteUser(userId: number): Promise<ServiceResponse> {
    try {
      const response = await api.deleteUser(this.getToken(), userId);
      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Convenience methods
  async getTrainers(): Promise<ServiceResponse> {
    return this.listUsers({ role: 'TRAINER' });
  }

  async getTrainees(): Promise<ServiceResponse> {
    return this.listUsers({ role: 'TRAINEE' });
  }
}

export default new UserService();
