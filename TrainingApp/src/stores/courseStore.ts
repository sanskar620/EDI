/**
 * Course Store (Zustand)
 * State management for courses, materials, and enrollments.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import courseService, { Course, CourseMaterial, CourseEnrollment } from '../services/courseService';

interface CourseState {
  courses: Course[];
  enrolledCourses: CourseEnrollment[];
  currentCourseMaterials: CourseMaterial[];
  trainees: any[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTrainerCourses: (trainerId: number) => Promise<void>;
  fetchPublishedCourses: () => Promise<void>;
  fetchEnrolledCourses: (userId: number) => Promise<void>;
  fetchCourseMaterials: (courseId: number) => Promise<void>;
  fetchAllTrainees: () => Promise<void>;
  createCourse: (course: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  publishCourse: (courseId: number) => Promise<boolean>;
  addMaterial: (material: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  deleteMaterial: (materialId: number) => Promise<{ success: boolean; error?: string }>;
  enrollTrainees: (courseId: number, userIds: number[]) => Promise<boolean>;
  updateProgress: (courseId: number, userId: number, progress: number) => Promise<boolean>;
}

export const useCourseStore = create<CourseState>()(
  persist(
    (set, get) => ({
  courses: [],
  enrolledCourses: [],
  currentCourseMaterials: [],
  trainees: [],
  isLoading: false,
  error: null,

  fetchTrainerCourses: async (trainerId: number) => {
    set({ isLoading: true, error: null });
    const result = await courseService.getTrainerCourses(trainerId);
    if (result.success) {
      set({ courses: result.data || [], isLoading: false });
    } else {
      set({ error: result.error, isLoading: false });
    }
  },

  fetchPublishedCourses: async () => {
    set({ isLoading: true, error: null });
    const result = await courseService.getPublishedCourses();
    if (result.success) {
      set({ courses: result.data || [], isLoading: false });
    } else {
      set({ error: result.error, isLoading: false });
    }
  },

  fetchEnrolledCourses: async (userId: number) => {
    set({ isLoading: true, error: null });
    const result = await courseService.getEnrolledCourses(userId);
    if (result.success) {
      set({ enrolledCourses: result.data || [], isLoading: false });
    } else {
      set({ error: result.error, isLoading: false });
    }
  },

  fetchCourseMaterials: async (courseId: number) => {
    set({ isLoading: true, error: null });
    const result = await courseService.getCourseMaterials(courseId);
    if (result.success) {
      set({ currentCourseMaterials: result.data || [], isLoading: false });
    } else {
      set({ error: result.error, isLoading: false });
    }
  },

  fetchAllTrainees: async () => {
    const result = await courseService.getAllTrainees();
    if (result.success) {
      set({ trainees: result.data || [] });
    }
  },

  createCourse: async (course: any) => {
    set({ isLoading: true });
    const result = await courseService.createCourse(course);
    set({ isLoading: false });
    return result;
  },

  publishCourse: async (courseId: number) => {
    const result = await courseService.publishCourse(courseId);
    return result.success;
  },

  addMaterial: async (material: any) => {
    set({ isLoading: true });
    const result = await courseService.addMaterial(material);
    if (result.success && result.data) {
      set((state) => ({
        currentCourseMaterials: [...state.currentCourseMaterials, result.data].sort((a, b) => a.order_index - b.order_index)
      }));
    }
    set({ isLoading: false });
    return result;
  },

  deleteMaterial: async (materialId: number) => {
    set({ isLoading: true });
    const result = await courseService.deleteMaterial(materialId);
    if (result.success) {
      set((state) => ({
        currentCourseMaterials: state.currentCourseMaterials.filter(m => m.id !== materialId)
      }));
    }
    set({ isLoading: false });
    return result;
  },

  enrollTrainees: async (courseId: number, userIds: number[]) => {
    const result = await courseService.enrollTrainees(courseId, userIds);
    return result.success;
  },

  updateProgress: async (courseId: number, userId: number, progress: number) => {
    const result = await courseService.updateProgress(courseId, userId, progress);
    return result.success;
  },
    }),
    {
      name: 'course-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
