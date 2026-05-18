/**
 * Assessments Service
 * 
 * Handles quiz/assessment creation, attempts, and scoring.
 * Powered by FastAPI Backend.
 */

import api from './api';
import authService from './authService';
import { AssessmentType } from '../config/supabase';

export interface Question {
  id: number;
  topic: string;
  module_code?: string;
  question_text: string;
  question_type: string;
  options?: string[];
  correct_answer: string;
  difficulty: number;
  points: number;
  is_active: boolean;
  created_at: string;
}

export interface AssessmentSession {
  id: number;
  session_id: number;
  user_id: number;
  assessment_type: AssessmentType;
  question_ids?: number[];
  total_questions: number;
  time_limit_seconds: number;
  started_at?: string;
  submitted_at?: string;
  is_submitted: boolean;
  is_auto_submitted: boolean;
  integrity_flags: number;
  app_switch_count: number;
  created_at: string;
}

export interface AssessmentAttempt {
  id: number;
  assessment_session_id: number;
  user_id: number;
  question_id: number;
  selected_answer?: string;
  is_correct?: boolean;
  time_spent_seconds?: number;
  answered_at?: string;
}

export interface AssessmentResult {
  id: number;
  assessment_session_id: number;
  session_id: number;
  user_id: number;
  assessment_type: AssessmentType;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  passed: boolean;
  attempt_number: number;
  created_at: string;
}

export interface ServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class AssessmentsService {
  private getToken() {
    const token = authService.getAuthToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  }

  /**
   * Create a question (Trainer only)
   */
  async createQuestion(questionData: Partial<Question>): Promise<ServiceResponse> {
    try {
      // Map UI names to backend schema
      const difficultyMap: Record<string, number> = {
        'EASY': 1,
        'MEDIUM': 2,
        'HARD': 3,
      };
      
      const difficultyValue = typeof (questionData as any).difficulty === 'string' 
        ? (difficultyMap[(questionData as any).difficulty] || 2) 
        : ((questionData as any).difficulty || 2);

      const opts = questionData.options || [];

      const payload = {
        session_id: (questionData as any).sessionId || (questionData as any).session_id,
        question_text: questionData.question_text,
        option_a: opts[0] || 'A',
        option_b: opts[1] || 'B',
        option_c: opts[2] || 'C',
        option_d: opts[3] || 'D',
        correct_answer: questionData.correct_answer,
        difficulty: difficultyValue,
        marks: questionData.points || (questionData as any).marks || 1
      };

      const response = await api.createQuestion(this.getToken(), payload);
      return response;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create question' };
    }
  }

  async getQuestions(filters?: {
    topic?: string;
    sessionId?: number;
    assessmentType?: string;
    module_code?: string;
    difficulty?: number;
    is_active?: boolean;
  }): Promise<ServiceResponse> {
    try {
      if (filters?.sessionId) {
        // Fetch from session specific endpoint
        const response = await api.getSessionQuestions(this.getToken(), filters.sessionId, true);
        if (response.success && response.data) {
          // Backend returns option_a, option_b etc. Map back to options array for UI
          const mappedData = response.data.map((q: any) => ({
            ...q,
            options: [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean)
          }));
          return { success: true, data: mappedData };
        }
        return response;
      }
      return { success: false, error: "Currently fetching questions without a sessionId is not supported by the backend." };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch questions' };
    }
  }

  /**
   * Start an assessment for a user
   */
  async startAssessment(
    sessionId: number,
    userId: number,
    assessmentType: AssessmentType,
    options?: {
      topic?: string;
      questionCount?: number;
      timeLimitSeconds?: number;
    }
  ): Promise<ServiceResponse> {
    try {
      const startResponse = await api.startAssessment(this.getToken(), sessionId, assessmentType);
      
      if (!startResponse.success) {
         return startResponse;
      }

      // Also fetch the questions
      const questionsResponse = await api.getSessionQuestions(this.getToken(), sessionId, false); // False hides correct answer for trainee
      
      if (questionsResponse.success && questionsResponse.data) {
        const mappedQuestions = questionsResponse.data.map((q: any) => ({
          ...q,
          options: [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean)
        }));
        
        return {
          success: true,
          data: {
            assessment: {
              id: startResponse.data.assessment_id,
              session_id: sessionId,
              user_id: userId,
              assessment_type: assessmentType,
              started_at: startResponse.data.started_at,
              is_submitted: false
            },
            questions: mappedQuestions
          }
        };
      }
      
      return questionsResponse;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to start assessment' };
    }
  }

  /**
   * Submit an answer
   */
  async submitAnswer(
    assessmentSessionId: number,
    userId: number,
    questionId: number,
    selectedAnswer: string
  ): Promise<ServiceResponse> {
    try {
      return await api.submitAnswer(this.getToken(), assessmentSessionId, questionId, selectedAnswer);
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to submit answer' };
    }
  }

  /**
   * Submit assessment and calculate results
   */
  async submitAssessment(
    assessmentSessionId: number,
    userId: number
  ): Promise<ServiceResponse> {
    try {
      const response = await api.submitAssessment(this.getToken(), assessmentSessionId);
      if (response.success && response.data) {
        // Map backend response back to expected UI format if needed
        return {
          success: true,
          data: {
            id: response.data.assessment_id,
            score_percentage: response.data.score_percentage,
            passed: response.data.passed,
            correct_answers: response.data.correct_answers,
            total_questions: response.data.total_questions,
          }
        };
      }
      return response;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to submit assessment' };
    }
  }

  /**
   * Get assessment results
   */
  async getAssessmentResults(assessmentSessionId: number): Promise<ServiceResponse> {
    try {
      return await api.getAssessmentResults(this.getToken(), assessmentSessionId);
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch results' };
    }
  }

  /**
   * Get user's assessment history
   */
  async getUserAssessmentHistory(userId: number): Promise<ServiceResponse> {
    try {
      return await api.getUserAssessmentHistory(this.getToken(), userId);
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch assessment history' };
    }
  }

  /**
   * Update question (Trainer only)
   */
  async updateQuestion(
    questionId: number,
    updates: Partial<Question>
  ): Promise<ServiceResponse> {
    // Backend doesn't currently support PUT /questions/:id, 
    // we would need to add that, but for now we'll fail gracefully or mock
    return { success: false, error: "Updating questions is currently unsupported via backend" };
  }

  /**
   * Delete question (soft delete)
   */
  async deleteQuestion(questionId: number): Promise<ServiceResponse> {
    try {
      return await api.deleteQuestion(this.getToken(), questionId);
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete question' };
    }
  }

  async getQuestionBank(topic?: string): Promise<ServiceResponse> {
    return this.getQuestions({ topic });
  }
}

export default new AssessmentsService();
