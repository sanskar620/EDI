/**
 * Offline Store — manages downloaded materials for offline viewing.
 *
 * Tracks which materials have been downloaded, stores them in the app's
 * document directory, and provides methods to download/delete/check status.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const OFFLINE_KEY = '@offline_materials';
const OFFLINE_DIR = `${FileSystem.documentDirectory}offline_materials/`;

export interface OfflineMaterial {
  materialId: string | number;
  title: string;
  materialType: string;
  localUri: string;
  fileSize: number;
  downloadedAt: string;
  s3Key: string;
}

interface OfflineState {
  downloads: Record<string, OfflineMaterial>; // keyed by materialId
  downloading: Record<string, number>;        // materialId -> progress (0-100)
  isLoaded: boolean;

  loadDownloads: () => Promise<void>;
  downloadMaterial: (material: any) => Promise<boolean>;
  deleteMaterial: (materialId: string | number) => Promise<void>;
  isDownloaded: (materialId: string | number) => boolean;
  getLocalUri: (materialId: string | number) => string | null;
  getDownloadProgress: (materialId: string | number) => number;
  getTotalOfflineSize: () => number;
  clearAllDownloads: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  downloads: {},
  downloading: {},
  isLoaded: false,

  loadDownloads: async () => {
    try {
      // Ensure offline directory exists
      const dirInfo = await FileSystem.getInfoAsync(OFFLINE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(OFFLINE_DIR, { intermediates: true });
      }

      const stored = await AsyncStorage.getItem(OFFLINE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, OfflineMaterial>;

        // Verify files still exist on disk
        const verified: Record<string, OfflineMaterial> = {};
        for (const [id, mat] of Object.entries(parsed)) {
          const info = await FileSystem.getInfoAsync(mat.localUri);
          if (info.exists) {
            verified[id] = mat;
          }
        }

        set({ downloads: verified, isLoaded: true });
        // Save back the verified list
        await AsyncStorage.setItem(OFFLINE_KEY, JSON.stringify(verified));
      } else {
        set({ isLoaded: true });
      }
    } catch (err) {
      console.error('[OfflineStore] Failed to load downloads:', err);
      set({ isLoaded: true });
    }
  },

  downloadMaterial: async (material: any) => {
    const materialId = String(material.id);
    const s3Key = material.s3_key || material.file_url;

    if (!s3Key) {
      console.error('[OfflineStore] No s3_key for material:', materialId);
      return false;
    }

    // Already downloaded?
    if (get().downloads[materialId]) return true;

    try {
      // Set progress to 0
      set(s => ({ downloading: { ...s.downloading, [materialId]: 0 } }));

      // Resolve download URL
      let downloadUrl = s3Key;
      if (!s3Key.startsWith('http://') && !s3Key.startsWith('https://')) {
        const materialsService = (await import('../services/materialsService')).default;
        const urlResult = await materialsService.getDownloadUrl(s3Key);
        if (!urlResult.success || !urlResult.data?.url) {
          throw new Error('Could not generate download URL');
        }
        downloadUrl = urlResult.data.url;
      }

      // Determine file extension
      const ext = s3Key.split('.').pop()?.toLowerCase() || 'bin';
      const localFileName = `${materialId}_${Date.now()}.${ext}`;
      const localUri = OFFLINE_DIR + localFileName;

      // Download with progress tracking
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        localUri,
        {},
        (progress) => {
          const pct = Math.round(
            (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100
          );
          set(s => ({ downloading: { ...s.downloading, [materialId]: pct } }));
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result || result.status !== 200) {
        throw new Error('Download failed');
      }

      // Get file size
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      const fileSize = (fileInfo as any).size || 0;

      // Save to state and persist
      const offlineMat: OfflineMaterial = {
        materialId,
        title: material.title || 'Material',
        materialType: material.material_type || 'DOCUMENT',
        localUri,
        fileSize,
        downloadedAt: new Date().toISOString(),
        s3Key,
      };

      const newDownloads = { ...get().downloads, [materialId]: offlineMat };
      const newDownloading = { ...get().downloading };
      delete newDownloading[materialId];

      set({ downloads: newDownloads, downloading: newDownloading });
      await AsyncStorage.setItem(OFFLINE_KEY, JSON.stringify(newDownloads));

      return true;
    } catch (err) {
      console.error('[OfflineStore] Download failed:', err);
      const newDownloading = { ...get().downloading };
      delete newDownloading[materialId];
      set({ downloading: newDownloading });
      return false;
    }
  },

  deleteMaterial: async (materialId) => {
    const id = String(materialId);
    const mat = get().downloads[id];
    if (!mat) return;

    try {
      await FileSystem.deleteAsync(mat.localUri, { idempotent: true });
    } catch {}

    const newDownloads = { ...get().downloads };
    delete newDownloads[id];
    set({ downloads: newDownloads });
    await AsyncStorage.setItem(OFFLINE_KEY, JSON.stringify(newDownloads));
  },

  isDownloaded: (materialId) => {
    return !!get().downloads[String(materialId)];
  },

  getLocalUri: (materialId) => {
    const mat = get().downloads[String(materialId)];
    return mat ? mat.localUri : null;
  },

  getDownloadProgress: (materialId) => {
    return get().downloading[String(materialId)] ?? -1; // -1 = not downloading
  },

  getTotalOfflineSize: () => {
    return Object.values(get().downloads).reduce((sum, m) => sum + m.fileSize, 0);
  },

  clearAllDownloads: async () => {
    try {
      await FileSystem.deleteAsync(OFFLINE_DIR, { idempotent: true });
      await FileSystem.makeDirectoryAsync(OFFLINE_DIR, { intermediates: true });
    } catch {}
    set({ downloads: {} });
    await AsyncStorage.setItem(OFFLINE_KEY, JSON.stringify({}));
  },
}));

export default useOfflineStore;
