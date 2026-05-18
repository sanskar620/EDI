import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import sessionsService from '../../services/sessionsService';
import attendanceService from '../../services/attendanceService';
import materialsService from '../../services/materialsService';
import { useOfflineStore } from '../../stores/offlineStore';
import { useAuthStore } from '../../stores/authStore';

export default function LearningPathScreen({ navigation, route }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const session = route?.params?.session;

  const [modules, setModules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [attendanceStatus, setAttendanceStatus] = useState<string>('NOT MARKED');
  
  const { user } = useAuthStore();
  const { loadDownloads, downloadMaterial, deleteMaterial, isDownloaded, getDownloadProgress, isLoaded } = useOfflineStore();

  useEffect(() => {
    loadDownloads();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (session?.id) fetchModules();
      else setIsLoading(false);
    }, [session?.id])
  );

  const fetchModules = async () => {
    setIsLoading(true);
    try {
      // Fetch attendance status
      if (user?.id && session?.id) {
        const attRes = await attendanceService.getUserAttendanceHistory(user.id);
        if (attRes.success && attRes.data) {
          const sessionAtt = attRes.data.find((a: any) => a.session_id === session.id);
          if (sessionAtt) setAttendanceStatus(sessionAtt.status);
        }
      }

      // Fetch modules
      const modRes = await sessionsService.getSessionModules(session.id);
      if (modRes.success && modRes.data) {
        // Map to expected format
        let allModules = modRes.data.map((m: any) => ({
          ...m,
          materials: m.materials || []
        }));
        
        // Unassigned materials are not currently supported by backend in the same way,
        // but we can just use the structured modules
        setModules(allModules);
      } else {
        setModules([]);
      }
    } catch (err) {
      console.error('Error fetching modules:', err);
      setModules([]);
    }
    setIsLoading(false);
  };

  const getIconForType = (type: string): any => {
    switch (type?.toUpperCase()) { case 'PDF': return 'picture-as-pdf'; case 'VIDEO': return 'play-circle-outline'; case 'PPT': return 'slideshow'; case 'IMAGE': return 'image'; default: return 'description'; }
  };

  const getColorForType = (type: string): string => {
    switch (type?.toUpperCase()) { case 'PDF': return '#ef4444'; case 'VIDEO': return '#3b82f6'; case 'PPT': return '#f59e0b'; default: return '#94a3b8'; }
  };

  const handleOpenMaterial = (material: any) => {
    const type = material.material_type?.toUpperCase();
    if (type === 'VIDEO') {
      navigation.navigate('VideoPlayer', { material });
    } else {
      navigation.navigate('DocumentViewer', { material });
    }
  };

  const handleDownload = async (material: any) => {
    const success = await downloadMaterial(material);
    if (success) {
      Alert.alert('✅ Downloaded', `"${material.title}" is now available offline.`);
    } else {
      Alert.alert('Error', 'Failed to download material. Check your connection.');
    }
  };

  const handleDeleteDownload = (material: any) => {
    Alert.alert(
      'Remove Offline Copy',
      `Delete the offline copy of "${material.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMaterial(material.id) },
      ]
    );
  };

  const renderMaterialCard = (material: any, mIdx: number) => {
    const downloaded = isDownloaded(material.id);
    const progress = getDownloadProgress(material.id);
    const isCurrentlyDownloading = progress >= 0;

    return (
      <View key={material.id} style={[s.materialCard, { marginLeft: 12, marginBottom: 6 }]}>
        {/* Open material on tap */}
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }} onPress={() => handleOpenMaterial(material)}>
          <Text style={{ color: C.tMuted, fontSize: 13, fontWeight: '700', marginRight: 4 }}>{mIdx + 1}.</Text>
          <View style={[s.materialIcon, { backgroundColor: getColorForType(material.material_type) + '22' }]}>
            <MaterialIcons name={getIconForType(material.material_type)} size={24} color={getColorForType(material.material_type)} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.materialTitle} numberOfLines={1}>{material.title}</Text>
              {downloaded && <MaterialIcons name="offline-pin" size={14} color="#10b981" />}
            </View>
            <Text style={s.materialSub}>
              {material.material_type || 'Document'}
              {material.file_size_bytes ? ` • ${(material.file_size_bytes / 1024 / 1024).toFixed(1)} MB` : ''}
              {downloaded ? ' • Offline ✓' : ''}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Download / Delete button */}
        {isCurrentlyDownloading ? (
          <View style={{ alignItems: 'center', width: 44 }}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={{ fontSize: 9, color: C.tMuted, marginTop: 2 }}>{progress}%</Text>
          </View>
        ) : downloaded ? (
          <TouchableOpacity onPress={() => handleDeleteDownload(material)} style={{ padding: 8 }}>
            <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => handleDownload(material)} style={{ padding: 8 }}>
            <MaterialIcons name="download-for-offline" size={24} color={C.primary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Learning Path</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Session Info */}
      {session && (
        <View style={s.sessionCard}>
          <Text style={s.sessionTitle}>{session.title}</Text>
          <Text style={s.sessionSub}>{session.topic} • {session.trainer_name || 'TBD'}</Text>
          {session.description && <Text style={s.sessionDesc}>{session.description}</Text>}
          
          {attendanceStatus === 'PRESENT' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#dcfce7', paddingVertical: 12, borderRadius: 12, marginTop: 16, borderWidth: 1, borderColor: '#86efac' }}>
              <MaterialIcons name="check-circle" size={20} color="#166534" />
              <Text style={{ color: '#166534', fontWeight: '700', fontSize: 14 }}>Attendance is Marked</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, paddingVertical: 12, borderRadius: 12, marginTop: 16 }}
              onPress={() => navigation.navigate('FaceCapture', { sessionId: session.id, mode: 'attendance' })}
            >
              <MaterialIcons name="face" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Verify Identity & Mark Attendance</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Assessment Section */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Assessments</Text>
              <View style={s.assessmentCol}>
                {session?.pre_test_enabled && (
                  <TouchableOpacity style={s.assessmentCard} onPress={() => navigation.navigate('Quiz', { sessionId: session.id, type: 'PRE_TEST', topic: session.topic })}>
                    <MaterialIcons name="quiz" size={28} color={C.warning} />
                    <Text style={s.assessmentTxt}>Pre-Test</Text>
                    <MaterialIcons name="chevron-right" size={24} color={C.tMuted} style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>
                )}
                {session?.post_test_enabled && (
                  <TouchableOpacity style={s.assessmentCard} onPress={() => navigation.navigate('Quiz', { sessionId: session.id, type: 'POST_TEST', topic: session.topic })}>
                    <MaterialIcons name="quiz" size={28} color={C.success} />
                    <Text style={s.assessmentTxt}>Post-Test</Text>
                    <MaterialIcons name="chevron-right" size={24} color={C.tMuted} style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Modules & Materials */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Training Modules ({modules.length})</Text>
              {modules.length === 0 ? (
                <View style={s.emptyCard}>
                  <MaterialIcons name="folder-open" size={40} color={C.tMuted} />
                  <Text style={s.emptyTxt}>No modules available yet</Text>
                </View>
              ) : (
                modules.map((mod: any, idx: number) => (
                  <View key={mod.id} style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: C.t1, marginBottom: 8 }}>Module {idx + 1}: {mod.title}</Text>
                    {mod.materials?.length === 0 ? (
                      <Text style={{ fontSize: 13, color: C.tMuted, fontStyle: 'italic', marginLeft: 12 }}>No materials in this module.</Text>
                    ) : (
                      mod.materials?.map((material: any, mIdx: number) => renderMaterialCard(material, mIdx))
                    )}
                  </View>
                ))
              )}
            </View>

            {/* Flashcards */}
            <View style={s.section}>
              <TouchableOpacity style={s.flashcardBtn} onPress={() => navigation.navigate('Flashcards', { topic: session?.topic })}>
                <MaterialIcons name="style" size={24} color={C.primary} />
                <Text style={s.flashcardTxt}>Study Flashcards</Text>
                <MaterialIcons name="chevron-right" size={22} color={C.tMuted} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  sessionCard: { marginHorizontal: 16, marginTop: 16, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, gap: 6 },
  sessionTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  sessionSub: { fontSize: 13, color: C.tMuted },
  sessionDesc: { fontSize: 13, color: C.tMuted, lineHeight: 19 },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.t1, marginBottom: 12 },
  assessmentCol: { flexDirection: 'column', gap: 12 },
  assessmentCard: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, alignItems: 'center', gap: 16 },
  assessmentTxt: { fontSize: 16, fontWeight: '700', color: C.t1 },
  materialCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8 },
  materialIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  materialTitle: { fontSize: 14, fontWeight: '600', color: C.t1, flexShrink: 1 },
  materialSub: { fontSize: 12, color: C.tMuted, marginTop: 2 },
  flashcardBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16 },
  flashcardTxt: { flex: 1, fontSize: 15, fontWeight: '600', color: C.t1 },
  emptyCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 32, alignItems: 'center', gap: 8 },
  emptyTxt: { color: C.tMuted, fontSize: 14 },
});
