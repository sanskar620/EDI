import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import sessionsService from '../../services/sessionsService';
import userService from '../../services/userService';
import enrollmentService from '../../services/enrollmentService';

export default function EnrollmentScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const [tab, setTab] = useState<'trainees' | 'trainer'>('trainees');
  const [sessions, setSessions] = useState<any[]>([]);
  const [trainees, setTrainees] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [selectedTrainees, setSelectedTrainees] = useState<Set<number>>(new Set());
  const [selectedTrainer, setSelectedTrainer] = useState<number | null>(null);
  const [enrolledTraineeIds, setEnrolledTraineeIds] = useState<Set<number>>(new Set());

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchSessionEnrollments(selectedSession);
    } else {
      setEnrolledTraineeIds(new Set());
    }
  }, [selectedSession]);

  const fetchSessionEnrollments = async (sessionId: number) => {
    const res = await enrollmentService.getSessionEnrollments(sessionId);
    if (res.success && res.data) {
      setEnrolledTraineeIds(new Set(res.data.map((e: any) => e.user_id)));
    } else {
      setEnrolledTraineeIds(new Set());
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    const [sessRes, traineeRes, trainerRes] = await Promise.all([
      sessionsService.getSessions(),
      userService.getTrainees(),
      userService.getTrainers(),
    ]);
    if (sessRes.success && sessRes.data) setSessions(sessRes.data);
    if (traineeRes.success && traineeRes.data) setTrainees(traineeRes.data);
    if (trainerRes.success && trainerRes.data) setTrainers(trainerRes.data);
    setLoading(false);
  };

  const toggleTrainee = (id: number) => {
    const next = new Set(selectedTrainees);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedTrainees(next);
  };

  const availableTrainees = trainees.filter(t => !enrolledTraineeIds.has(t.id));

  const selectAll = () => {
    if (selectedTrainees.size === availableTrainees.length && availableTrainees.length > 0) {
      setSelectedTrainees(new Set());
    } else {
      setSelectedTrainees(new Set(availableTrainees.map(t => t.id)));
    }
  };

  const handleEnrollTrainees = async () => {
    if (!selectedSession) { Alert.alert('Error', 'Select a session'); return; }
    if (selectedTrainees.size === 0) { Alert.alert('Error', 'Select at least one trainee'); return; }
    setLoading(true);

    const res = await enrollmentService.enrollUsersInSession(
      selectedSession,
      Array.from(selectedTrainees)
    );

    setLoading(false);
    if (res.success) {
      Alert.alert('✅ Enrollment Complete', `${selectedTrainees.size} trainees processed`);
      fetchSessionEnrollments(selectedSession); // Refresh the list
    } else {
      Alert.alert('Error', res.error || 'Failed to enroll trainees');
    }
    setSelectedTrainees(new Set());
  };

  const handleAssignTrainer = async () => {
    if (!selectedSession) { Alert.alert('Error', 'Select a session'); return; }
    if (!selectedTrainer) { Alert.alert('Error', 'Select a trainer'); return; }
    setLoading(true);
    const res = await sessionsService.updateSession(selectedSession, { trainer_id: selectedTrainer } as any);
    setLoading(false);
    if (!res.success) {
      Alert.alert('Error', res.error || 'Failed to assign trainer');
    } else {
      Alert.alert('✅ Assigned', 'Trainer assigned to session');
      fetchAll();
    }
  };

  const selectedSessionData = sessions.find(s => s.id === selectedSession);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Enrollment</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabBtn, tab === 'trainees' && s.tabBtnActive]} onPress={() => setTab('trainees')}>
          <MaterialIcons name="groups" size={18} color={tab === 'trainees' ? '#fff' : C.tMuted} />
          <Text style={[s.tabTxt, tab === 'trainees' && s.tabTxtActive]}>Enroll Trainees</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === 'trainer' && s.tabBtnActive]} onPress={() => setTab('trainer')}>
          <MaterialIcons name="person-add" size={18} color={tab === 'trainer' ? '#fff' : C.tMuted} />
          <Text style={[s.tabTxt, tab === 'trainer' && s.tabTxtActive]}>Assign Trainer</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Session Selector */}
        <Text style={s.sectionTitle}>Select Session</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {sessions.filter(s => {
              if (s.status === 'COMPLETED' || s.status === 'CANCELLED') return false;
              if (s.end_time) {
                const endDate = new Date(s.end_time);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (endDate.getTime() < today.getTime()) return false;
              }
              return true;
            }).map(sess => (
              <TouchableOpacity key={sess.id} style={[s.sessionChip, selectedSession === sess.id && s.sessionChipActive]} onPress={() => setSelectedSession(sess.id)}>
                <Text style={[s.sessionChipTxt, selectedSession === sess.id && s.sessionChipTxtActive]} numberOfLines={1}>{sess.title}</Text>
                <Text style={[s.sessionChipSub, selectedSession === sess.id && { color: '#fff8' }]}>{sess.status}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {selectedSession && (
          <View style={s.selectedBanner}>
            <MaterialIcons name="event" size={18} color={C.primary} />
            <Text style={s.selectedTxt}>Selected: {selectedSessionData?.title}</Text>
          </View>
        )}

        {tab === 'trainees' ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={s.sectionTitle}>Select Trainees</Text>
              <TouchableOpacity onPress={selectAll}>
                <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>
                  {selectedTrainees.size === availableTrainees.length && availableTrainees.length > 0 ? 'Deselect All' : 'Select All'} ({selectedTrainees.size})
                </Text>
              </TouchableOpacity>
            </View>
            {availableTrainees.length === 0 ? (
              <Text style={{ color: C.tMuted, fontStyle: 'italic', marginBottom: 16 }}>All available trainees are already enrolled in this session.</Text>
            ) : (
              availableTrainees.map(t => (
                <TouchableOpacity key={t.id} style={s.userRow} onPress={() => toggleTrainee(t.id)}>
                  <MaterialIcons name={selectedTrainees.has(t.id) ? 'check-box' : 'check-box-outline-blank'} size={22} color={selectedTrainees.has(t.id) ? C.primary : C.tMuted} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.userName}>{t.full_name}</Text>
                    <Text style={s.userSub}>{t.employee_id}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity style={s.actionBtn} onPress={handleEnrollTrainees} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <><MaterialIcons name="how-to-reg" size={20} color="#fff" /><Text style={s.actionBtnTxt}>Enroll {selectedTrainees.size} Trainees</Text></>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[s.sectionTitle, { marginBottom: 12 }]}>Select Trainer</Text>
            {trainers.filter(t => t.id !== selectedSessionData?.trainer_id).length === 0 ? (
              <Text style={{ color: C.tMuted, fontStyle: 'italic', marginBottom: 16 }}>No available trainers.</Text>
            ) : (
              trainers.filter(t => t.id !== selectedSessionData?.trainer_id).map(t => (
                <TouchableOpacity key={t.id} style={[s.userRow, selectedTrainer === t.id && { borderColor: C.primary, backgroundColor: C.primary + '08' }]} onPress={() => setSelectedTrainer(t.id)}>
                  <MaterialIcons name={selectedTrainer === t.id ? 'radio-button-checked' : 'radio-button-unchecked'} size={22} color={selectedTrainer === t.id ? C.primary : C.tMuted} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.userName}>{t.full_name}</Text>
                    <Text style={s.userSub}>{t.employee_id}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity style={s.actionBtn} onPress={handleAssignTrainer} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <><MaterialIcons name="person-add" size={20} color="#fff" /><Text style={s.actionBtnTxt}>Assign Trainer</Text></>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 8 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  tabBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabTxt: { fontSize: 13, fontWeight: '700', color: C.tMuted },
  tabTxtActive: { color: '#fff' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.t1 },
  sessionChip: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, minWidth: 120 },
  sessionChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  sessionChipTxt: { fontSize: 13, fontWeight: '700', color: C.t1 },
  sessionChipTxtActive: { color: '#fff' },
  sessionChipSub: { fontSize: 10, color: C.tMuted, marginTop: 2 },
  selectedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary + '12', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  selectedTxt: { fontSize: 14, fontWeight: '600', color: C.primary },
  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  userName: { fontSize: 15, fontWeight: '700', color: C.t1 },
  userSub: { fontSize: 12, color: C.tMuted, marginTop: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  actionBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
