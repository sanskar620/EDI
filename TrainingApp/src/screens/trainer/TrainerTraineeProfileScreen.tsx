import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useReportingStore } from '../../stores/reportingStore';

export default function TrainerTraineeProfileScreen({ navigation, route }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const userId = route?.params?.userId;
  const { userPerformance, fetchUserPerformance, isLoading } = useReportingStore();

  useEffect(() => {
    if (userId) fetchUserPerformance(userId);
  }, [userId]);

  const perf = userPerformance;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Trainee Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
        ) : perf ? (
          <>
            {/* User Info */}
            <View style={s.profileCard}>
              <View style={s.avatar}>
                <Text style={s.avatarTxt}>{(perf.user?.full_name || 'U').charAt(0)}</Text>
              </View>
              <Text style={s.name}>{perf.user?.full_name || 'Unknown'}</Text>
              <Text style={s.empId}>{perf.user?.employee_id || ''} • {perf.user?.department || 'N/A'}</Text>
            </View>

            {/* KPI Grid */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Performance Summary</Text>
              <View style={s.kpiGrid}>
                <View style={[s.kpiCard, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                  <Text style={[s.kpiVal, { color: '#3b82f6' }]}>{perf.summary?.total_sessions_enrolled || 0}</Text>
                  <Text style={s.kpiLabel}>Enrolled</Text>
                </View>
                <View style={[s.kpiCard, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                  <Text style={[s.kpiVal, { color: C.success }]}>{perf.summary?.total_sessions_attended || 0}</Text>
                  <Text style={s.kpiLabel}>Attended</Text>
                </View>
                <View style={[s.kpiCard, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
                  <Text style={[s.kpiVal, { color: C.warning }]}>{perf.summary?.attendance_rate || 0}%</Text>
                  <Text style={s.kpiLabel}>Attendance</Text>
                </View>
                <View style={[s.kpiCard, { backgroundColor: 'rgba(168,85,247,0.1)' }]}>
                  <Text style={[s.kpiVal, { color: '#a855f7' }]}>{perf.summary?.average_score || 0}%</Text>
                  <Text style={s.kpiLabel}>Avg Score</Text>
                </View>
              </View>
            </View>

            {/* Assessment Details */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Assessment Details</Text>
              <View style={s.card}>
                <View style={s.dataRow}>
                  <Text style={s.dataLabel}>Total Assessments</Text>
                  <Text style={s.dataValue}>{perf.summary?.total_assessments || 0}</Text>
                </View>
                <View style={s.dataRow}>
                  <Text style={s.dataLabel}>Passed</Text>
                  <Text style={[s.dataValue, { color: C.success }]}>{perf.summary?.assessments_passed || 0}</Text>
                </View>
                <View style={s.dataRow}>
                  <Text style={s.dataLabel}>Certificates Earned</Text>
                  <Text style={[s.dataValue, { color: '#a855f7' }]}>{perf.summary?.certificates_earned || 0}</Text>
                </View>
              </View>
            </View>

            {/* Attendance History */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Recent Attendance</Text>
              {(perf.attendance_history || []).slice(0, 5).map((record: any, idx: number) => (
                <View key={idx} style={s.historyRow}>
                  <MaterialIcons name="check-circle" size={18} color={C.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.historyTitle}>{record.session?.title || 'Session'}</Text>
                    <Text style={s.historySub}>{record.check_in_time ? new Date(record.check_in_time).toLocaleString() : ''}</Text>
                  </View>
                </View>
              ))}
              {(!perf.attendance_history || perf.attendance_history.length === 0) && (
                <Text style={s.emptyTxt}>No attendance records</Text>
              )}
            </View>
          </>
        ) : (
          <View style={s.emptyCard}>
            <MaterialIcons name="person-off" size={48} color={C.tMuted} />
            <Text style={s.emptyTxt}>Trainee data not found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  profileCard: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: C.white, fontSize: 28, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '800', color: C.t1 },
  empId: { fontSize: 13, color: C.tMuted },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.t1, marginBottom: 12 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: { flex: 1, minWidth: '46%', borderRadius: 12, padding: 16, alignItems: 'center', gap: 4 },
  kpiVal: { fontSize: 24, fontWeight: '800' },
  kpiLabel: { fontSize: 11, color: C.tMuted },
  card: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, gap: 14 },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dataLabel: { fontSize: 14, color: C.tMuted },
  dataValue: { fontSize: 16, fontWeight: '700', color: C.t1 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  historyTitle: { fontSize: 14, fontWeight: '600', color: C.t1 },
  historySub: { fontSize: 12, color: C.tMuted, marginTop: 2 },
  emptyCard: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTxt: { color: C.tMuted, fontSize: 14 },
});
