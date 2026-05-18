import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useReportingStore } from '../../stores/reportingStore';

export default function ComplianceOverviewScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { dashboardStats, fetchDashboardStats, monthlyReport, fetchMonthlyReport, isLoading } = useReportingStore();

  useEffect(() => {
    fetchDashboardStats();
    const now = new Date();
    fetchMonthlyReport(now.getFullYear(), now.getMonth() + 1);
  }, []);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Compliance Overview</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Certification Stats */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Certification Status</Text>
              <View style={s.statsRow}>
                <View style={[s.statCard, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                  <MaterialIcons name="workspace-premium" size={28} color={C.success} />
                  <Text style={[s.statVal, { color: C.success }]}>{dashboardStats?.certificates_issued || 0}</Text>
                  <Text style={s.statLabel}>Certificates Issued</Text>
                </View>
                <View style={[s.statCard, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                  <MaterialIcons name="groups" size={28} color="#3b82f6" />
                  <Text style={[s.statVal, { color: '#3b82f6' }]}>{dashboardStats?.user_stats?.trainees || 0}</Text>
                  <Text style={s.statLabel}>Total Trainees</Text>
                </View>
              </View>
            </View>

            {/* Training Completion */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Training Completion</Text>
              <View style={s.card}>
                <View style={s.dataRow}>
                  <Text style={s.dataLabel}>Sessions Completed</Text>
                  <Text style={s.dataValue}>{dashboardStats?.session_stats?.completed || 0}</Text>
                </View>
                <View style={s.dataRow}>
                  <Text style={s.dataLabel}>Published Sessions</Text>
                  <Text style={s.dataValue}>{dashboardStats?.session_stats?.published || 0}</Text>
                </View>
                <View style={s.dataRow}>
                  <Text style={s.dataLabel}>Training Materials</Text>
                  <Text style={s.dataValue}>{dashboardStats?.materials_count || 0}</Text>
                </View>
                <View style={s.dataRow}>
                  <Text style={s.dataLabel}>Active Trainers</Text>
                  <Text style={s.dataValue}>{dashboardStats?.user_stats?.trainers || 0}</Text>
                </View>
              </View>
            </View>

            {/* Monthly Summary */}
            {monthlyReport && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>This Month</Text>
                <View style={s.card}>
                  <View style={s.dataRow}>
                    <Text style={s.dataLabel}>Sessions Held</Text>
                    <Text style={s.dataValue}>{monthlyReport.sessions?.total || 0}</Text>
                  </View>
                  <View style={s.dataRow}>
                    <Text style={s.dataLabel}>Total Check-ins</Text>
                    <Text style={s.dataValue}>{monthlyReport.attendance?.total_check_ins || 0}</Text>
                  </View>
                  <View style={s.dataRow}>
                    <Text style={s.dataLabel}>Assessments Taken</Text>
                    <Text style={s.dataValue}>{monthlyReport.assessments?.total || 0}</Text>
                  </View>
                  <View style={s.dataRow}>
                    <Text style={s.dataLabel}>Avg Assessment Score</Text>
                    <Text style={s.dataValue}>{monthlyReport.assessments?.average_score || 0}%</Text>
                  </View>
                </View>
              </View>
            )}
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
  section: { paddingHorizontal: 16, paddingTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.t1, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, borderRadius: 14, padding: 20, alignItems: 'center', gap: 8 },
  statVal: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 11, color: C.tMuted, textAlign: 'center' },
  card: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, gap: 14 },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dataLabel: { fontSize: 14, color: C.tMuted },
  dataValue: { fontSize: 16, fontWeight: '700', color: C.t1 },
});
