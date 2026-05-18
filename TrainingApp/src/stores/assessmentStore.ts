/**
 * Assessment Store — Zustand state management for quizzes and assessments.
 */

import { create } from 'zustand';
import assessmentsService from '../services/assessmentsService';

interface AssessmentState {
  questions: any[];
  currentAssessment: any | null;
  assessmentResults: any[];
  userHistory: any[];
  isLoading: boolean;
  error: string | null;

  fetchQuestions: (filters?: { topic?: string; sessionId?: number; assessmentType?: string }) => Promise<void>;
  createQuestion: (data: any) => Promise<boolean>;
  updateQuestion: (questionId: number, data: any) => Promise<boolean>;
  deleteQuestion: (questionId: number) => Promise<boolean>;
  startAssessment: (sessionId: number, userId: number, type: string, options?: any) => Promise<any | null>;
  submitAnswer: (assessmentSessionId: number, userId: number, questionId: number, answer: string) => Promise<boolean>;
  submitAssessment: (assessmentSessionId: number, userId: number) => Promise<any | null>;
  fetchResults: (assessmentSessionId: number) => Promise<void>;
  fetchUserHistory: (userId: number) => Promise<void>;
  clearError: () => void;
  clearCurrentAssessment: () => void;
}

export const useAssessmentStore = create<AssessmentState>((set, get) => ({
  questions: [],
  currentAssessment: null,
  assessmentResults: [],
  userHistory: [],
  isLoading: false,
  error: null,

  fetchQuestions: async (filters) => {
    set({ isLoading: true, error: null });
    const result = await assessmentsService.getQuestions(filters as any);
    if (result.success) {
      set({ questions: result.data, isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch questions', isLoading: false });
    }
  },

  createQuestion: async (data) => {
    set({ isLoading: true, error: null });
    const result = await assessmentsService.createQuestion(data);
    if (result.success) {
      set((state) => ({ questions: [...state.questions, result.data], isLoading: false }));
      return true;
    } else {
      set({ error: result.error || 'Failed to create question', isLoading: false });
      return false;
    }
  },

  updateQuestion: async (questionId, data) => {
    set({ isLoading: true, error: null });
    const result = await assessmentsService.updateQuestion(questionId, data);
    if (result.success) {
      set((state) => ({
        questions: state.questions.map((q) => (q.id === questionId ? { ...q, ...result.data } : q)),
        isLoading: false,
      }));
      return true;
    } else {
      set({ error: result.error || 'Failed to update question', isLoading: false });
      return false;
    }
  },

  deleteQuestion: async (questionId) => {
    set({ isLoading: true, error: null });
    const result = await assessmentsService.deleteQuestion(questionId);
    if (result.success) {
      set((state) => ({
        questions: state.questions.filter((q) => q.id !== questionId),
        isLoading: false,
      }));
      return true;
    } else {
      set({ error: result.error || 'Failed to delete question', isLoading: false });
      return false;
    }
  },

  startAssessment: async (sessionId, userId, type, options) => {
    set({ isLoading: true, error: null });
    const result = await assessmentsService.startAssessment(sessionId, userId, type as any, options);
    if (result.success && result.data) {
      // Service returns { assessment, questions } — extract both
      const assessment = result.data.assessment || result.data;
      const returnedQuestions = result.data.questions || [];
      set({ currentAssessment: assessment, questions: returnedQuestions, isLoading: false });
      return assessment;
    } else {
      set({ error: result.error || 'Failed to start assessment', isLoading: false });
      return null;
    }
  },

  submitAnswer: async (assessmentSessionId, userId, questionId, answer) => {
    const result = await assessmentsService.submitAnswer(assessmentSessionId, userId, questionId, answer);
    return result.success;
  },

  submitAssessment: async (assessmentSessionId, userId) => {
    set({ isLoading: true, error: null });
    const result = await assessmentsService.submitAssessment(assessmentSessionId, userId);
    if (result.success) {
      set({ currentAssessment: null, isLoading: false });
      return result.data;
    } else {
      set({ error: result.error || 'Failed to submit assessment', isLoading: false });
      return null;
    }
  },

  fetchResults: async (assessmentSessionId) => {
    set({ isLoading: true, error: null });
    const result = await assessmentsService.getAssessmentResults(assessmentSessionId);
    if (result.success) {
      set({ assessmentResults: Array.isArray(result.data) ? result.data : [result.data], isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch results', isLoading: false });
    }
  },

  fetchUserHistory: async (userId) => {
    set({ isLoading: true, error: null });
    const result = await assessmentsService.getUserAssessmentHistory(userId);
    if (result.success) {
      set({ userHistory: result.data, isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch history', isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
  clearCurrentAssessment: () => set({ currentAssessment: null }),
}));

export default useAssessmentStore;
