import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import certificateService from '../../services/certificateService';

export default function CertificateScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user } = useAuthStore();
  const [certificates, setCertificates] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    fetchCertificates();
  }, [user?.id]);

  const fetchCertificates = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const res = await certificateService.getUserCertificates(user.id);

      if (res.success && res.data) {
        setCertificates(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch certificates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = async (cert: any) => {
    if (!cert.certificate_s3_key) {
      Alert.alert('Not Available', 'The certificate has not been generated yet.');
      return;
    }
    
    const { API_BASE_URL } = require('../../services/api');
    const url = cert.certificate_s3_key.startsWith('http') ? cert.certificate_s3_key : `${API_BASE_URL.replace('/api/v1', '')}${cert.certificate_s3_key}`;
    
    navigation.navigate('DocumentViewer', {
      title: cert.session?.title || cert.module_name || 'Certificate',
      uri: url,
      materialType: 'IMAGE',
    });
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Certificates</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={certificates}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.certIcon}>
                <MaterialIcons name="workspace-premium" size={32} color={C.warning} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.certTitle}>{item.session?.title || item.certificate_number || 'Certificate'}</Text>
                <Text style={s.certSub}>{item.session?.topic || ''}</Text>
                <Text style={s.certDate}>
                  Issued: {item.issued_at ? new Date(item.issued_at).toLocaleDateString() : item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleView(item)} style={{ padding: 10, backgroundColor: C.primary, borderRadius: 10 }}>
                <MaterialIcons name="visibility" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={s.emptyCard}>
              <MaterialIcons name="workspace-premium" size={48} color={C.tMuted} />
              <Text style={s.emptyTitle}>No Certificates Yet</Text>
              <Text style={s.emptyText}>Complete training sessions to earn certificates</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16 },
  certIcon: { width: 52, height: 52, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.15)', alignItems: 'center', justifyContent: 'center' },
  certTitle: { fontSize: 15, fontWeight: '700', color: C.t1 },
  certSub: { fontSize: 12, color: C.tMuted },
  certDate: { fontSize: 11, color: C.tLight },
  emptyCard: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.t1 },
  emptyText: { fontSize: 13, color: C.tMuted },
});
