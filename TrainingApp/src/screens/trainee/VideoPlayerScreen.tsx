import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useThemeStore } from '../../theme';
import materialsService from '../../services/materialsService';
import { useOfflineStore } from '../../stores/offlineStore';

export default function VideoPlayerScreen({ navigation, route }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const material = route?.params?.material;
  const { getLocalUri } = useOfflineStore();

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const player = useVideoPlayer(videoUrl, player => {
    player.loop = false;
    if(videoUrl) player.play();
  });

  useEffect(() => {
    resolveUrl();
  }, []);

  const resolveUrl = async () => {
    // Check if direct uri was passed (like from DownloadsScreen)
    if (route?.params?.uri) {
      setVideoUrl(route.params.uri);
      return;
    }

    const localUri = getLocalUri(material?.id);
    if (localUri) {
      setVideoUrl(localUri);
      return;
    }

    const key = material?.s3_key || material?.file_url;
    if (!key) return;

    if (key.startsWith('http://') || key.startsWith('https://')) {
      setVideoUrl(key);
      return;
    }

    const urlResult = await materialsService.getDownloadUrl(key);

    if (urlResult.success && urlResult.data) {
      setVideoUrl(urlResult.data.url);
    } else {
      Alert.alert('Error', 'Could not load video. Download it for offline access.');
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      if (!videoUrl) { Alert.alert('Error', 'No video URL'); return; }
      
      if (videoUrl.startsWith('file://')) {
        Alert.alert('Already Downloaded', 'This video is already available offline.');
        setDownloading(false);
        return;
      }

      const ext = material?.title?.split('.').pop() || 'mp4';
      const vidTitle = (material?.title || 'Video').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      const dir = FileSystem.documentDirectory + 'materials/';
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
      const localUri = dir + `${vidTitle}.${ext}`;

      const downloadResult = await FileSystem.downloadAsync(videoUrl, localUri);

      if (downloadResult.status === 200) {
        Alert.alert('Downloaded', `"${material?.title || 'Video'}" saved for offline access. Find it in Downloads.`);
      } else {
        Alert.alert('Error', 'Download failed');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{material?.title || 'Video Player'}</Text>
        <TouchableOpacity onPress={handleDownload} disabled={downloading}>
          {downloading ? <ActivityIndicator size="small" color={C.primary} /> : <MaterialIcons name="file-download" size={24} color={C.primary} />}
        </TouchableOpacity>
      </View>

      {/* Video player */}
      <View style={s.playerArea}>
        {videoUrl ? (
          <VideoView
            player={player}
            style={s.video}
          />
        ) : (
          <View style={s.loadingOverlay}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={{ color: '#aaa', marginTop: 12 }}>Loading video...</Text>
          </View>
        )}
      </View>

      {/* Info section */}
      <View style={s.infoSection}>
        <Text style={s.infoTitle}>{material?.title || 'Untitled'}</Text>
        {material?.description && <Text style={s.infoDesc}>{material.description}</Text>}
        <View style={s.metaRow}>
          <MaterialIcons name="category" size={16} color={C.tMuted} />
          <Text style={s.metaTxt}>{material?.topic || 'General'}</Text>
        </View>
        {(material?.file_size_bytes || material?.file_size) && (
          <View style={s.metaRow}>
            <MaterialIcons name="storage" size={16} color={C.tMuted} />
            <Text style={s.metaTxt}>{((material.file_size_bytes || material.file_size) / 1024 / 1024).toFixed(1)} MB</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.t1, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  playerArea: { aspectRatio: 16 / 9, backgroundColor: '#000', position: 'relative' },
  video: { width: '100%', height: '100%' },
  loadingOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoSection: { padding: 16, gap: 8 },
  infoTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  infoDesc: { fontSize: 14, color: C.tMuted, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaTxt: { fontSize: 13, color: C.tMuted },
});
