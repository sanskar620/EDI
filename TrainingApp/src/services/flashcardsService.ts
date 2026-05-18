import api from './api';
import authService from './authService';

interface ServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class FlashcardsService {
  private getToken() {
    const token = authService.getAuthToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  }

  async getFlashcards(topic?: string): Promise<ServiceResponse> {
    try {
      const response = await api.getFlashcards(this.getToken(), topic);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch flashcards',
      };
    }
  }
}

export default new FlashcardsService();
