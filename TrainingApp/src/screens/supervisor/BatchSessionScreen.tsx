import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useSessionsStore } from '../../stores/sessionsStore';
import { useEnrollmentStore } from '../../stores/enrollmentStore';
import { UserRole } from '../../config/supabase';

export default function BatchSessionScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { getAllUsers, user } = useAuthStore();
  const { sessions, fetchSessions } = useSessionsStore();
  const { bulkEnroll, isLoading } = useEnrollmentStore();

  const [trainees, setTrainees] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [selectedTrainees, setSelectedTrainees] = useState<Set<number>>(new Set());

  // Runtime role check for security
  useEffect(() => {
    if (user?.role !== UserRole.SUPERVISOR && (user?.role as any) !== 'SUPERVISOR') {
      Alert.alert(
        'Access Denied',
        'Only supervisors can perform bulk enrollment',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [user?.role]);

  useEffect(() => {
    fetchSessions({ status: 'PUBLISHED' } as any);
    loadTrainees();
  }, []);

  const loadTrainees = async () => {
    const users = await getAllUsers({ role: UserRole.TRAINEE });
    setTrainees(users || []);
  };

  const toggleTrainee = (id: number) => {
    setSelectedTrainees((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkEnroll = async () => {
    if (!selectedSession) { Alert.alert('Error', 'Select a session first'); return; }
    if (selectedTrainees.size === 0) { Alert.alert('Error', 'Select at least one trainee'); return; }

    Alert.alert('Bulk Enroll', `Enroll ${selectedTrainees.size} trainees?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Enroll', onPress: async () => {
        const success = await bulkEnroll(selectedSession, Array.from(selectedTrainees));
        if (success) {
          Alert.alert('Success', 'Trainees enrolled successfully');
          setSelectedTrainees(new Set());
        } else {
          Alert.alert('Error', 'Some enrollments failed');
        }
      }},
    ]);
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Batch Session</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Select Session */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Select Session</Text>
          {sessions.filter((s: any) => s.status === 'PUBLISHED').map((session: any) => (
            <TouchableOpacity key={session.id} style={[s.sessionCard, selectedSession === session.id && s.sessionCardActive]} onPress={() => setSelectedSession(session.id)}>
              <MaterialIcons name={selectedSession === session.id ? 'radio-button-checked' : 'radio-button-unchecked'} size={22} color={selectedSession === session.id ? C.primary : C.tMuted} />
              <View style={{ flex: 1 }}>
                <Text style={s.sessionTitle}>{session.title}</Text>
                <Text style={s.sessionSub}>{session.topic} • {session.enrolled_count || 0}/{session.max_capacity || '∞'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Select Trainees */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Select Trainees ({selectedTrainees.size})</Text>
            <TouchableOpacity onPress={() => setSelectedTrainees(selectedTrainees.size === trainees.length ? new Set() : new Set(trainees.map((t: any) => t.id)))}>
              <Text style={s.selectAllTxt}>{selectedTrainees.size === trainees.length ? 'Deselect All' : 'Select All'}</Text>
            </TouchableOpacity>
          </View>
          {trainees.map((trainee: any) => (
            <TouchableOpacity key={trainee.id} style={s.traineeCard} onPress={() => toggleTrainee(trainee.id)}>
              <MaterialIcons name={selectedTrainees.has(trainee.id) ? 'check-box' : 'check-box-outline-blank'} size={22} color={selectedTrainees.has(trainee.id) ? C.primary : C.tMuted} />
              <View style={s.traineeAvatar}>
                <Text style={s.traineeAvatarTxt}>{(trainee.full_name || 'U').charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.traineeName}>{trainee.full_name}</Text>
                <Text style={s.traineeEmpId}>{trainee.employee_id} • {trainee.department || 'N/A'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={[s.enrollBtn, (!selectedSession || selectedTrainees.size === 0) && s.btnDisabled]} onPress={handleBulkEnroll} disabled={isLoading || !selectedSession || selectedTrainees.size === 0}>
          {isLoading ? <ActivityIndicator color={C.white} /> : (
            <Text style={s.enrollBtnTxt}>Enroll {selectedTrainees.size} Trainee{selectedTrainees.size !== 1 ? 's' : ''}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.t1, marginBottom: 12 },
  selectAllTxt: { color: C.primary, fontSize: 13, fontWeight: '600' },
  sessionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8 },
  sessionCardActive: { borderColor: C.primary },
  sessionTitle: { fontSize: 14, fontWeight: '700', color: C.t1 },
  sessionSub: { fontSize: 12, color: C.tMuted, marginTop: 2 },
  traineeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  traineeAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary + '22', alignItems: 'center', justifyContent: 'center' },
  traineeAvatarTxt: { color: C.primary, fontSize: 14, fontWeight: '700' },
  traineeName: { fontSize: 14, fontWeight: '600', color: C.t1 },
  traineeEmpId: { fontSize: 12, color: C.tMuted },
  bottomBar: { padding: 16, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg },
  enrollBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  enrollBtnTxt: { color: C.white, fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
