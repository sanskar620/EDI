import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useThemeStore } from '../../theme';

export default function DownloadsScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const [downloadedFiles, setDownloadedFiles] = useState<any[]>([]);

  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    try {
      const files: any[] = [];
      
      const determineType = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const isVideo = ['mp4', 'mov', 'webm'].includes(ext);
        const isPdf = ext === 'pdf';
        const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
        const isPpt = ['ppt', 'pptx'].includes(ext);
        
        if (isVideo) return 'VIDEO';
        if (isPdf) return 'PDF';
        if (isImage) return 'IMAGE';
        if (isPpt) return 'PPT';
        return 'DOCUMENT';
      };

      // Check materials directory
      const matDir = FileSystem.documentDirectory + 'materials/';
      const matInfo = await FileSystem.getInfoAsync(matDir);
      if (matInfo.exists) {
        const matFiles = await FileSystem.readDirectoryAsync(matDir);
        matFiles.forEach(f => {
          files.push({ name: f, uri: matDir + f, type: determineType(f) });
        });
      }
      
      // Check course directory
      const courseDirs = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory || '');
      for (const dir of courseDirs) {
        if (dir.startsWith('course_')) {
          const cDir = FileSystem.documentDirectory + dir + '/';
          const cInfo = await FileSystem.getInfoAsync(cDir);
          if (cInfo.exists) {
            const cFiles = await FileSystem.readDirectoryAsync(cDir);
            cFiles.forEach(f => {
              files.push({ name: f, uri: cDir + f, type: determineType(f) });
            });
          }
        }
      }
      
      setDownloadedFiles(files);
    } catch (e) {
      console.log('Failed to load downloads', e);
    }
  };

  const handlePress = async (file: any) => {
    if (file.type === 'VIDEO' || file.type === 'video') {
      navigation.navigate('VideoPlayer', {
        title: file.name,
        uri: file.uri,
      });
    } else {
      navigation.navigate('DocumentViewer', {
        title: file.name,
        uri: file.uri,
        materialType: file.type // Pass the correctly resolved type (PDF, PPT, IMAGE, DOCUMENT)
      });
    }
  };

  const handleDelete = async (file: any) => {
    Alert.alert('Delete', `Remove ${file.name} from downloads?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await FileSystem.deleteAsync(file.uri);
          loadDownloads();
        } catch (e) {
          Alert.alert('Error', 'Failed to delete file');
        }
      }}
    ]);
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Downloads</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={downloadedFiles}
        keyExtractor={item => item.uri}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <MaterialIcons name="file-download-off" size={48} color={C.tMuted} />
            <Text style={s.emptyTxt}>No downloaded materials found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.fileCard} onPress={() => handlePress(item)}>
            <View style={s.iconWrap}>
              <MaterialIcons name={(item.type === 'video' || item.type === 'VIDEO') ? 'play-circle-filled' : (item.type === 'IMAGE' ? 'image' : 'description')} size={24} color={C.primary} />
            </View>
            <View style={s.fileInfo}>
              <Text style={s.fileName} numberOfLines={1}>{item.name}</Text>
              <Text style={s.fileType}>{(item.type === 'video' || item.type === 'VIDEO') ? 'Video Material' : item.type + ' Document'}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item)} style={s.delBtn}>
              <MaterialIcons name="delete-outline" size={22} color={C.error} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  fileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 15, fontWeight: '600', color: C.t1, marginBottom: 2 },
  fileType: { fontSize: 12, color: C.tMuted },
  delBtn: { padding: 8 },
  emptyCard: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 60 },
  emptyTxt: { fontSize: 15, color: C.tMuted, marginTop: 12, fontWeight: '600' }
});
