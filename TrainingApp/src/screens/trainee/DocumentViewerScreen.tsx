import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ScreenCapture from 'expo-screen-capture';
import { useThemeStore } from '../../theme';
import materialsService from '../../services/materialsService';
import { useOfflineStore } from '../../stores/offlineStore';

export default function DocumentViewerScreen({ navigation, route }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const material = route?.params?.material;
  const directUri = route?.params?.uri;
  const directTitle = route?.params?.title;
  const directType = route?.params?.materialType;
  const { getLocalUri } = useOfflineStore();

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [offlineActionRequired, setOfflineActionRequired] = useState(false);

  useEffect(() => {
    resolveUrl();
    ScreenCapture.preventScreenCaptureAsync();
    return () => {
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  const resolveUrl = async () => {
    // If direct URI was passed (from CourseDetailScreen or Downloads), use it immediately
    if (directUri) {
      setFileUrl(directUri);
      const isLocal = directUri.startsWith('file://');
      setIsOffline(isLocal);
      
      // If it's a local non-image, force the offline action UI
      if (isLocal && material?.material_type?.toUpperCase() !== 'IMAGE' && directType?.toUpperCase() !== 'IMAGE') {
        setOfflineActionRequired(true);
      }
      
      setLoading(false);
      return;
    }

    // Check offline store first — serves file without internet
    const localUri = getLocalUri(material?.id);
    if (localUri) {
      setFileUrl(localUri);
      setIsOffline(true);
      setLoading(false);
      if (material?.material_type?.toUpperCase() !== 'IMAGE') {
        setOfflineActionRequired(true);
      }
      return;
    }

    const key = material?.s3_key || material?.file_url;
    if (!key) {
      setLoading(false);
      return;
    }

    if (key.startsWith('http://') || key.startsWith('https://')) {
      setFileUrl(key);
      setLoading(false);
      return;
    }

    const urlResult = await materialsService.getDownloadUrl(key);

    if (urlResult.success && urlResult.data) {
      setFileUrl(urlResult.data.url);
    } else {
      Alert.alert('Error', 'Could not load document. Download it for offline access.');
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!fileUrl) return;
    
    // Check if it's already a local file
    if (fileUrl.startsWith('file://')) {
      Alert.alert('Already Downloaded', 'This document is already available offline.');
      return;
    }
    
    try {
      setDownloading(true);
      const ext = getFileExtension();
      const docTitle = (material?.title || directTitle || 'Document').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      const dir = FileSystem.documentDirectory + 'materials/';
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
      const localUri = dir + `${docTitle}.${ext}`;

      const downloadResult = await FileSystem.downloadAsync(fileUrl, localUri);

      if (downloadResult.status === 200) {
        Alert.alert('Downloaded', `"${material?.title || directTitle || 'Document'}" saved for offline access. Find it in Downloads.`);
      } else {
        Alert.alert('Error', 'Download failed');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setDownloading(false);
    }
  };

  const getFileExtension = (): string => {
    const type = (material?.material_type || directType || 'PDF').toUpperCase();
    const key = material?.s3_key || '';
    // Try to extract from s3_key
    const ext = key.split('.').pop()?.toLowerCase();
    if (ext && ext.length <= 5) return ext;
    // Fallback by type
    switch (type) {
      case 'PDF': return 'pdf';
      case 'PPT': return 'pptx';
      case 'IMAGE': return 'jpg';
      default: return 'pdf';
    }
  };

  const getMimeType = (): string => {
    const type = (material?.material_type || directType || 'PDF').toUpperCase();
    switch (type) {
      case 'PDF': return 'application/pdf';
      case 'PPT': return 'application/vnd.ms-powerpoint';
      case 'IMAGE': return 'image/jpeg';
      case 'DOCUMENT': return 'application/msword';
      default: return 'application/octet-stream';
    }
  };

  const getViewerUrl = (): string => {
    if (!fileUrl) return '';
    const type = (material?.material_type || directType || 'PDF').toUpperCase();

    // For images, display directly
    if (type === 'IMAGE') {
      return fileUrl;
    }

    // For offline files (local URI), load directly in WebView
    if (isOffline || fileUrl.startsWith('file://')) {
      return fileUrl;
    }

    // Use PDF.js for PDFs, allowing local URLs via CORS
    if (type === 'PDF') {
      const encoded = encodeURIComponent(fileUrl);
      return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encoded}`;
    }

    // Other Online files — use Google Docs Viewer for PPTs, docs
    const encoded = encodeURIComponent(fileUrl);
    return `https://docs.google.com/gview?embedded=true&url=${encoded}`;
  };

  const getTypeIcon = (): string => {
    const type = (material?.material_type || directType || 'PDF').toUpperCase();
    switch (type) {
      case 'PDF': return 'picture-as-pdf';
      case 'PPT': return 'slideshow';
      case 'IMAGE': return 'image';
      case 'VIDEO': return 'play-circle-outline';
      default: return 'description';
    }
  };

  const getTypeColor = (): string => {
    const type = (material?.material_type || directType || 'PDF').toUpperCase();
    switch (type) {
      case 'PDF': return '#ef4444';
      case 'PPT': return '#f59e0b';
      case 'IMAGE': return '#10b981';
      default: return '#3b82f6';
    }
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>{material?.title || directTitle || 'Document'}</Text>
          <View style={s.headerMeta}>
            <View style={[s.typeBadge, { backgroundColor: getTypeColor() + '20' }]}>
              <MaterialIcons name={getTypeIcon() as any} size={12} color={getTypeColor()} />
              <Text style={[s.typeBadgeText, { color: getTypeColor() }]}>{material?.material_type || directType || 'DOC'}</Text>
            </View>
            {(material?.file_size_bytes) && (
              <Text style={s.headerSize}>{(material.file_size_bytes / 1024 / 1024).toFixed(1)} MB</Text>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={handleDownload} disabled={downloading || !fileUrl} style={s.headerBtn}>
          {downloading ? (
            <ActivityIndicator size="small" color={C.primary} />
          ) : (
            <MaterialIcons name="file-download" size={24} color={fileUrl ? C.primary : C.tMuted} />
          )}
        </TouchableOpacity>
      </View>

      {/* Content area */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingTxt}>Loading document...</Text>
        </View>
      ) : !fileUrl ? (
        <View style={s.center}>
          <MaterialIcons name="error-outline" size={48} color={C.tMuted} />
          <Text style={s.emptyTxt}>Document not available</Text>
          <Text style={s.emptySubTxt}>The file could not be loaded from storage</Text>
        </View>
      ) : offlineActionRequired ? (
        <View style={s.center}>
          <MaterialIcons name="offline-pin" size={48} color={'#10b981'} />
          <Text style={s.emptyTxt}>Downloaded Document</Text>
          <Text style={s.emptySubTxt}>This document is saved offline and available for viewing.</Text>
          <TouchableOpacity style={s.openBtn} onPress={() => {
            if (fileUrl) {
              // Open in WebView directly instead of sharing
              setOfflineActionRequired(false);
            }
          }}>
            <MaterialIcons name="visibility" size={20} color="#fff" />
            <Text style={s.openBtnTxt}>View Document</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          source={{ uri: getViewerUrl() }}
          style={s.webview}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={[s.center, StyleSheet.absoluteFill, { backgroundColor: C.bg }]}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={s.loadingTxt}>Rendering document...</Text>
            </View>
          )}
          onError={() => {
            Alert.alert('Error', 'Failed to render document. Try downloading instead.');
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scalesPageToFit={true}
        />
      )}
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: C.t1 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  headerSize: { fontSize: 11, color: C.tMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingTxt: { color: C.tMuted, fontSize: 14, marginTop: 8 },
  emptyTxt: { color: C.t1, fontSize: 16, fontWeight: '600' },
  emptySubTxt: { color: C.tMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
  webview: { flex: 1 },
  openBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 16 },
  openBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
