/**
 * Materials Store — Zustand state management for training materials.
 */

import { create } from 'zustand';
import materialsService from '../services/materialsService';

interface MaterialsState {
  materials: any[];
  currentMaterial: any | null;
  isLoading: boolean;
  error: string | null;

  fetchMaterials: (filters?: { topic?: string; type?: string }) => Promise<void>;
  fetchMaterialById: (id: number) => Promise<void>;
  fetchMaterialsByTopic: (topic: string) => Promise<void>;
  searchMaterials: (query: string) => Promise<void>;
  uploadMaterial: (file: any, metadata: any) => Promise<boolean>;
  updateMaterial: (id: number, updates: any) => Promise<boolean>;
  deleteMaterial: (id: number) => Promise<boolean>;
  getDownloadUrl: (s3Key: string) => Promise<string | null>;
  clearError: () => void;
}

export const useMaterialsStore = create<MaterialsState>((set, get) => ({
  materials: [],
  currentMaterial: null,
  isLoading: false,
  error: null,

  fetchMaterials: async (filters) => {
    set({ isLoading: true, error: null });
    const result = await materialsService.getMaterials(filters as any);
    if (result.success) {
      set({ materials: result.data, isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch materials', isLoading: false });
    }
  },

  fetchMaterialById: async (id) => {
    set({ isLoading: true, error: null });
    const result = await materialsService.getMaterialById(id);
    if (result.success) {
      set({ currentMaterial: result.data, isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch material', isLoading: false });
    }
  },

  fetchMaterialsByTopic: async (topic) => {
    set({ isLoading: true, error: null });
    const result = await materialsService.getMaterialsByTopic(topic);
    if (result.success) {
      set({ materials: result.data, isLoading: false });
    } else {
      set({ error: result.error || 'Failed to fetch materials', isLoading: false });
    }
  },

  searchMaterials: async (query) => {
    set({ isLoading: true, error: null });
    const result = await materialsService.searchMaterials(query);
    if (result.success) {
      set({ materials: result.data, isLoading: false });
    } else {
      set({ error: result.error || 'Failed to search materials', isLoading: false });
    }
  },

  uploadMaterial: async (file, metadata) => {
    set({ isLoading: true, error: null });
    const result = await materialsService.uploadMaterial(file, metadata);
    if (result.success) {
      set((state) => ({ materials: [result.data, ...state.materials], isLoading: false }));
      return true;
    } else {
      set({ error: result.error || 'Failed to upload material', isLoading: false });
      return false;
    }
  },

  updateMaterial: async (id, updates) => {
    set({ isLoading: true, error: null });
    const result = await materialsService.updateMaterial(id, updates);
    if (result.success) {
      set((state) => ({
        materials: state.materials.map((m) => (m.id === id ? { ...m, ...result.data } : m)),
        isLoading: false,
      }));
      return true;
    } else {
      set({ error: result.error || 'Failed to update material', isLoading: false });
      return false;
    }
  },

  deleteMaterial: async (id) => {
    set({ isLoading: true, error: null });
    const result = await materialsService.deleteMaterial(id);
    if (result.success) {
      set((state) => ({
        materials: state.materials.filter((m) => m.id !== id),
        isLoading: false,
      }));
      return true;
    } else {
      set({ error: result.error || 'Failed to delete material', isLoading: false });
      return false;
    }
  },

  getDownloadUrl: async (s3Key: string) => {
    const result = await materialsService.getDownloadUrl(s3Key);
    if (result.success) {
      return result.data;
    }
    return null;
  },

  clearError: () => set({ error: null }),
}));

export default useMaterialsStore;
