import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useSessionsStore } from '../../stores/sessionsStore';
import { useEnrollmentStore } from '../../stores/enrollmentStore';

export default function TrainerTraineesScreen({ navigation, route }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user } = useAuthStore();
  const { sessions, fetchSessions } = useSessionsStore();
  const { sessionEnrollments, fetchSessionEnrollments, isLoading } = useEnrollmentStore();
  const [allTrainees, setAllTrainees] = useState<any[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  const sessionId = route?.params?.sessionId;

  useEffect(() => {
    if (sessionId) {
      fetchSessionEnrollments(sessionId);
    } else if (user?.id) {
      // Fetch all trainer's sessions, then gather all unique trainees
      loadAllTrainees();
    }
  }, [sessionId, user?.id]);

  const loadAllTrainees = async () => {
    setLoadingAll(true);
    await fetchSessions({ trainerId: user?.id, role: 'TRAINER', currentUserId: user?.id });
    const trainerSessions = useSessionsStore.getState().sessions;
    const seenIds = new Set<number>();
    const trainees: any[] = [];
    for (const sess of trainerSessions) {
      await fetchSessionEnrollments(sess.id);
      const enrollments = useEnrollmentStore.getState().sessionEnrollments;
      for (const e of enrollments) {
        // Backend returns flat fields: user_id, full_name, employee_id
        const tid = e.user?.id || e.user_id;
        if (tid && !seenIds.has(tid)) {
          seenIds.add(tid);
          trainees.push({
            id: tid,
            name: e.user?.full_name || e.full_name || 'Unknown',
            employee_id: e.user?.employee_id || e.employee_id || '',
            department: e.user?.department || e.department || 'N/A',
            status: e.status,
          });
        }
      }
    }
    setAllTrainees(trainees);
    setLoadingAll(false);
  };

  const trainees = sessionId
    ? sessionEnrollments.map((e: any) => ({
        id: e.user?.id || e.user_id,
        // Backend returns flat: full_name, employee_id; but may also be nested under user
        name: e.user?.full_name || e.full_name || 'Unknown',
        employee_id: e.user?.employee_id || e.employee_id || '',
        department: e.user?.department || e.department || 'N/A',
        status: e.status,
      }))
    : allTrainees;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Trainees ({trainees.length})</Text>
        <View style={{ width: 24 }} />
      </View>

      {(isLoading || loadingAll) ? (
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={trainees}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => navigation.navigate('TrainerTraineeProfile', { userId: item.id })}>
              <View style={s.avatar}>
                <Text style={s.avatarTxt}>{item.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.name}</Text>
                <Text style={s.empId}>{item.employee_id} • {item.department}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: getStatusColor(item.status) + '22' }]}>
                <Text style={[s.statusTxt, { color: getStatusColor(item.status) }]}>{item.status}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.emptyCard}>
              <MaterialIcons name="group" size={48} color={C.tMuted} />
              <Text style={s.emptyTxt}>No trainees found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function getStatusColor(status: string): string {
  switch (status) { case 'ATTENDED': return '#10b981'; case 'ACCEPTED': return '#3b82f6'; case 'INVITED': return '#f59e0b'; case 'DECLINED': return '#ef4444'; default: return '#94a3b8'; }
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary + '22', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: C.primary, fontSize: 18, fontWeight: '700' },
  name: { fontSize: 14, fontWeight: '700', color: C.t1 },
  empId: { fontSize: 12, color: C.tMuted, marginTop: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusTxt: { fontSize: 10, fontWeight: '700' },
  emptyCard: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTxt: { fontSize: 14, color: C.tMuted },
});
