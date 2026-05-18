/**
 * Materials Service
 * 
 * Handles training materials upload, download, and management.
 * Powered by FastAPI Backend.
 */

import api from './api';
import authService from './authService';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialType } from '../config/supabase';

export interface Material {
  id: number;
  title: string;
  description?: string;
  material_type: MaterialType;
  topic: string;
  s3_key: string;
  s3_key_compressed?: string;
  file_size_bytes?: number;
  duration_seconds?: number;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class MaterialsService {
  private getToken() {
    const token = authService.getAuthToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  }

  /**
   * Upload material to Backend
   * Note: Trainer/Supervisor only
   */
  async uploadMaterial(
    file: any,
    metadata: {
      title: string;
      description?: string;
      topic: string;
      material_type?: MaterialType;
      module_id?: number;
      order_number?: number;
    }
  ): Promise<ServiceResponse> {
    try {
      const formData = new FormData();
      formData.append('title', metadata.title);
      formData.append('topic', metadata.topic);
      if (metadata.description) formData.append('description', metadata.description);
      if (metadata.module_id) formData.append('module_id', metadata.module_id.toString());
      if (metadata.order_number) formData.append('order_number', metadata.order_number.toString());

      // Append file
      formData.append('file', {
        uri: file.uri,
        name: file.name || `material_${Date.now()}`,
        type: file.mimeType || 'application/octet-stream',
      } as any);

      const response = await api.uploadMaterial(this.getToken(), formData);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to upload material',
      };
    }
  }

  /**
   * Get all materials with filters
   */
  async getMaterials(filters?: {
    topic?: string;
    material_type?: string;
    is_active?: boolean;
  }): Promise<ServiceResponse> {
    try {
      const response = await api.getMaterials(this.getToken(), filters?.topic, filters?.material_type);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch materials',
      };
    }
  }

  /**
   * Get material by ID
   */
  async getMaterialById(materialId: number): Promise<ServiceResponse> {
    try {
      const response = await api.getMaterial(this.getToken(), materialId);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch material',
      };
    }
  }

  /**
   * Get download URL for a material
   */
  async getDownloadUrl(s3Key: string): Promise<ServiceResponse> {
    try {
      // Backend now stores local file path (e.g. /uploads/materials/...)
      const { API_BASE_URL } = require('./api');
      const baseUrl = API_BASE_URL.replace('/api/v1', '');
      const fullUrl = `${baseUrl}${s3Key}`;
      return {
        success: true,
        data: { url: fullUrl },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to construct download URL',
      };
    }
  }

  /**
   * Delete material (soft delete - Trainer/Supervisor only)
   */
  async deleteMaterial(materialId: number): Promise<ServiceResponse> {
    try {
      const response = await api.deleteMaterial(this.getToken(), materialId);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete material',
      };
    }
  }

  /**
   * Download material to device
   */
  async downloadMaterial(materialId: number): Promise<ServiceResponse> {
    try {
      const materialResult = await this.getMaterialById(materialId);
      if (!materialResult.success) {
        return materialResult;
      }

      const material = materialResult.data;
      const urlResult = await this.getDownloadUrl(material.s3_key);
      
      if (!urlResult.success) {
        return urlResult;
      }

      const fileName = material.s3_key.split('/').pop() || 'downloaded_file';
      const downloadPath = `${FileSystem.documentDirectory}${fileName}`;

      const downloadResult = await FileSystem.downloadAsync(
        urlResult.data.url,
        downloadPath
      );

      return {
        success: true,
        data: {
          uri: downloadResult.uri,
          fileName,
          material,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to download material',
      };
    }
  }

  /**
   * Pick file from device (helper method)
   */
  async pickFile(): Promise<ServiceResponse> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return {
          success: false,
          error: 'File selection cancelled',
        };
      }

      return {
        success: true,
        data: result.assets[0],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to pick file',
      };
    }
  }

  /**
   * Get materials by topic
   */
  async getMaterialsByTopic(topic: string): Promise<ServiceResponse> {
    return this.getMaterials({ topic, is_active: true });
  }

  async searchMaterials(query: string): Promise<ServiceResponse> {
    // Basic implementation just uses topic for now until backend adds generic search
    return this.getMaterials({ topic: query });
  }

  async updateMaterial(materialId: number, updates: any): Promise<ServiceResponse> {
    // Mock implementation for now since backend materials endpoint doesn't have PUT/PATCH yet
    return { success: true, data: updates };
  }

  async createMaterial(file: any, metadata: any): Promise<ServiceResponse> {
    return this.uploadMaterial(file, metadata);
  }
}

export default new MaterialsService();
