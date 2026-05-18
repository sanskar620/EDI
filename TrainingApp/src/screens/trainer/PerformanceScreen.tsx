import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useReportingStore } from '../../stores/reportingStore';

export default function PerformanceScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user } = useAuthStore();
  const { trainerReport, fetchTrainerReport, isLoading } = useReportingStore();

  useEffect(() => {
    if (user?.id) fetchTrainerReport(user.id);
  }, [user?.id]);

  const summary = trainerReport?.summary;
  const sessions = trainerReport?.sessions || [];

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Performance</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={s.section}>
              <Text style={s.sectionTitle}>Overview</Text>
              <View style={s.statsCard}>
                <View style={s.statRow}>
                  <Text style={s.statLabel}>Total Sessions</Text>
                  <Text style={s.statValue}>{summary?.total_sessions || 0}</Text>
                </View>
                <View style={s.statRow}>
                  <Text style={s.statLabel}>Completed</Text>
                  <Text style={[s.statValue, { color: C.success }]}>{summary?.completed_sessions || 0}</Text>
                </View>
                <View style={s.statRow}>
                  <Text style={s.statLabel}>Ongoing</Text>
                  <Text style={[s.statValue, { color: C.warning }]}>{summary?.ongoing_sessions || 0}</Text>
                </View>
                <View style={s.statRow}>
                  <Text style={s.statLabel}>Trainees Trained</Text>
                  <Text style={s.statValue}>{summary?.total_trainees_trained || 0}</Text>
                </View>
                <View style={s.statRow}>
                  <Text style={s.statLabel}>Materials Uploaded</Text>
                  <Text style={s.statValue}>{summary?.materials_uploaded || 0}</Text>
                </View>
              </View>
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Session History</Text>
              {sessions.length === 0 ? (
                <Text style={s.emptyTxt}>No sessions yet</Text>
              ) : (
                sessions.map((session: any) => (
                  <TouchableOpacity key={session.id} style={s.sessionCard} onPress={() => navigation.navigate('SessionDetails', { sessionId: session.id })}>
                    <View style={[s.statusIndicator, { backgroundColor: getStatusColor(session.status) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.sessionTitle} numberOfLines={1}>{session.title}</Text>
                      <Text style={s.sessionMeta}>
                        {session.topic} • {session.scheduled_date ? new Date(session.scheduled_date).toLocaleDateString() : 'TBD'}
                      </Text>
                    </View>
                    <Text style={[s.statusTxt, { color: getStatusColor(session.status) }]}>{session.status}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function getStatusColor(status: string): string {
  switch (status) { case 'COMPLETED': return '#10b981'; case 'PUBLISHED': return '#3b82f6'; case 'ONGOING': return '#f59e0b'; case 'DRAFT': return '#94a3b8'; case 'CANCELLED': return '#ef4444'; default: return '#94a3b8'; }
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.t1, marginBottom: 12 },
  statsCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, gap: 14 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: 14, color: C.tMuted },
  statValue: { fontSize: 18, fontWeight: '700', color: C.t1 },
  sessionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8, gap: 12 },
  statusIndicator: { width: 4, height: 36, borderRadius: 2 },
  sessionTitle: { fontSize: 14, fontWeight: '700', color: C.t1 },
  sessionMeta: { fontSize: 12, color: C.tMuted, marginTop: 4 },
  statusTxt: { fontSize: 11, fontWeight: '700' },
  emptyTxt: { color: C.tMuted, fontSize: 14, textAlign: 'center', paddingTop: 20 },
});
