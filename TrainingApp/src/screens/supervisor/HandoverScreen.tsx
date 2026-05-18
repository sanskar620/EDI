import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useSessionsStore } from '../../stores/sessionsStore';
import { UserRole } from '../../config/supabase';

export default function HandoverScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { getAllUsers, user } = useAuthStore();
  const { sessions, fetchSessions, updateSession, isLoading } = useSessionsStore();
  const [trainers, setTrainers] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<number | null>(null);

  // Runtime role check for security
  useEffect(() => {
    if (user?.role !== UserRole.SUPERVISOR && (user?.role as any) !== 'SUPERVISOR') {
      Alert.alert(
        'Access Denied',
        'Only supervisors can reassign sessions',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [user?.role]);

  useEffect(() => {
    fetchSessions({});
    loadTrainers();
  }, []);

  const loadTrainers = async () => {
    const users = await getAllUsers({ role: UserRole.TRAINER });
    setTrainers(users || []);
  };

  const handleHandover = async () => {
    if (!selectedSession || !selectedTrainer) {
      Alert.alert('Error', 'Select both a session and a trainer');
      return;
    }
    Alert.alert('Confirm Handover', 'Reassign this session to the selected trainer?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        const success = await updateSession(selectedSession, { trainer_id: selectedTrainer });
        if (success) {
          Alert.alert('Success', 'Session reassigned successfully');
          setSelectedSession(null);
          setSelectedTrainer(null);
          fetchSessions({});
        } else {
          Alert.alert('Error', 'Failed to reassign session');
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
        <Text style={s.headerTitle}>Session Handover</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Select Session to Reassign</Text>
          {sessions.map((session: any) => (
            <TouchableOpacity key={session.id} style={[s.card, selectedSession === session.id && s.cardActive]} onPress={() => setSelectedSession(session.id)}>
              <MaterialIcons name={selectedSession === session.id ? 'radio-button-checked' : 'radio-button-unchecked'} size={22} color={selectedSession === session.id ? C.primary : C.tMuted} />
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{session.title}</Text>
                <Text style={s.cardSub}>Current: {session.trainer_name || 'Unassigned'} • {session.status}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Assign to Trainer</Text>
          {trainers.map((trainer: any) => (
            <TouchableOpacity key={trainer.id} style={[s.card, selectedTrainer === trainer.id && s.cardActive]} onPress={() => setSelectedTrainer(trainer.id)}>
              <MaterialIcons name={selectedTrainer === trainer.id ? 'radio-button-checked' : 'radio-button-unchecked'} size={22} color={selectedTrainer === trainer.id ? C.primary : C.tMuted} />
              <View style={s.trainerAvatar}>
                <Text style={s.trainerAvatarTxt}>{(trainer.full_name || 'T').charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{trainer.full_name}</Text>
                <Text style={s.cardSub}>{trainer.employee_id} • {trainer.department || 'N/A'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={s.bottomBar}>
        <TouchableOpacity style={[s.handoverBtn, (!selectedSession || !selectedTrainer) && s.btnDisabled]} onPress={handleHandover} disabled={isLoading || !selectedSession || !selectedTrainer}>
          {isLoading ? <ActivityIndicator color={C.white} /> : (
            <>
              <MaterialIcons name="swap-horiz" size={20} color={C.white} />
              <Text style={s.handoverBtnTxt}>Handover Session</Text>
            </>
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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.t1, marginBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8 },
  cardActive: { borderColor: C.primary },
  cardTitle: { fontSize: 14, fontWeight: '700', color: C.t1 },
  cardSub: { fontSize: 12, color: C.tMuted, marginTop: 2 },
  trainerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary + '22', alignItems: 'center', justifyContent: 'center' },
  trainerAvatarTxt: { color: C.primary, fontSize: 14, fontWeight: '700' },
  bottomBar: { padding: 16, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg },
  handoverBtn: { flexDirection: 'row', backgroundColor: C.warning, borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  handoverBtnTxt: { color: C.white, fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
