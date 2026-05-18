import React, { useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useSessionsStore } from '../../stores/sessionsStore';
import { useEnrollmentStore } from '../../stores/enrollmentStore';
import { useReportingStore } from '../../stores/reportingStore';
import { useNotificationStore } from '../../stores/notificationStore';
// import removed

export default function TraineeDashboard({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user } = useAuthStore();
  const { sessions, isLoading: sessionsLoading, fetchUserSessions } = useSessionsStore();
  const { userEnrollments, fetchUserEnrollments } = useEnrollmentStore();
  const { userPerformance, fetchUserPerformance, isLoading: reportLoading } = useReportingStore();
  const { unreadCount, fetchUnreadCount } = useNotificationStore();

  const fetchData = useCallback(() => {
    if (user?.id) {
      fetchUserSessions(user.id);
      fetchUserEnrollments(user.id);
      fetchUserPerformance(user.id);
      fetchUnreadCount(user.id);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  useEffect(() => {
    // Supabase realtime removed. Relying on useFocusEffect for data freshness.
  }, [user?.id, fetchData]);

  const stats = [
    { label: 'Enrolled', value: String(userPerformance?.summary?.total_sessions_enrolled || 0), icon: 'menu-book' as const, color: '#3b82f6', target: 'CoursesTab' },
    { label: 'Attended', value: String(userPerformance?.summary?.total_sessions_attended || 0), icon: 'check-circle' as const, color: C.success, target: 'SessionsTab' },
    { label: 'Assessments', value: String(userPerformance?.summary?.total_assessments || 0), icon: 'pending' as const, color: C.warning, target: 'SessionsTab' },
    { label: 'Certificates', value: String(userPerformance?.summary?.certificates_earned || 0), icon: 'workspace-premium' as const, color: '#a855f7', target: 'Certificates' },
  ];

  const isLoading = sessionsLoading || reportLoading;

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <ScrollView style={s.root} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{getTimeGreeting()},</Text>
          <Text style={s.name}>{user?.full_name || 'Trainee'} 👋</Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Downloads')}>
            <MaterialIcons name="file-download" size={22} color={C.t1} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('CommsTab')}>
            <MaterialIcons name="notifications" size={22} color={C.t1} />
            {unreadCount > 0 && <View style={s.notifDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Stats grid */}
          <View style={s.statsGrid}>
            {stats.map((st) => (
              <TouchableOpacity 
                key={st.label} 
                style={s.statCard}
                onPress={() => {
                  if (st.target === 'Certificates') navigation.navigate('Certificates');
                  else if (st.target) navigation.navigate(st.target);
                }}
                activeOpacity={0.7}
              >
                <View style={[s.statIcon, { backgroundColor: st.color + '22' }]}>
                  <MaterialIcons name={st.icon} size={20} color={st.color} />
                </View>
                <Text style={s.statVal}>{st.value}</Text>
                <Text style={s.statLbl}>{st.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* My Learning */}
          <View style={s.section}>
            <View style={s.sectionHdr}>
              <Text style={s.sectionTitle}>My Learning</Text>
              <TouchableOpacity onPress={() => navigation.navigate('CoursesTab')}>
                <Text style={s.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {sessions.length === 0 ? (
              <View style={s.emptyCard}>
                <MaterialIcons name="school" size={40} color={C.tMuted} />
                <Text style={s.emptyText}>No enrolled courses yet</Text>
                <TouchableOpacity style={s.enrollBtn} onPress={() => navigation.navigate('CoursesTab')}>
                  <Text style={s.enrollBtnTxt}>Browse Courses</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
                {sessions.slice(0, 5).map((session: any) => (
                  <TouchableOpacity
                    key={session.id}
                    style={s.courseCard}
                    onPress={() => navigation.navigate('CoursesTab', { screen: 'LearningPath', params: { session } })}
                  >
                    <View style={[s.courseTag, { backgroundColor: getTopicColor(session.topic) + '22' }]}>
                      <Text style={[s.courseTagTxt, { color: getTopicColor(session.topic) }]}>
                        {(session.topic || 'GENERAL').toUpperCase()}
                      </Text>
                    </View>
                    <Text style={s.courseTitle} numberOfLines={2}>{session.title}</Text>
                    <View style={s.statusRow}>
                      <View style={[s.statusBadge, { backgroundColor: getStatusColor(session.enrollment_status || session.status, C) + '22' }]}>
                        <Text style={[s.statusBadgeTxt, { color: getStatusColor(session.enrollment_status || session.status, C) }]}>
                          {session.enrollment_status || session.status}
                        </Text>
                      </View>
                    </View>
                    <View style={s.durRow}>
                      <MaterialIcons name="schedule" size={13} color={C.tMuted} />
                      <Text style={s.durTxt}>
                        {session.scheduled_date ? new Date(session.scheduled_date).toLocaleDateString() : 'TBD'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Attendance Summary */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Performance</Text>
            <View style={s.perfCard}>
              <View style={s.perfRow}>
                <Text style={s.perfLabel}>Attendance Rate</Text>
                <Text style={s.perfValue}>{userPerformance?.summary?.attendance_rate || '0'}%</Text>
              </View>
              <View style={s.perfRow}>
                <Text style={s.perfLabel}>Average Score</Text>
                <Text style={s.perfValue}>{userPerformance?.summary?.average_score || '0'}%</Text>
              </View>
              <View style={s.perfRow}>
                <Text style={s.perfLabel}>Assessments Passed</Text>
                <Text style={s.perfValue}>{userPerformance?.summary?.assessments_passed || 0} / {userPerformance?.summary?.total_assessments || 0}</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function getTopicColor(topic: string): string {
  const colors: Record<string, string> = {
    'Fire Safety': '#ef4444',
    'Compliance': '#ef4444',
    'Technical': '#3b82f6',
    'Soft Skills': '#a855f7',
    'Leadership': '#10b981',
  };
  return colors[topic] || '#3b82f6';
}

function getStatusColor(status: string, C: any): string {
  switch (status) {
    case 'ATTENDED': return C.success;
    case 'ACCEPTED': return '#3b82f6';
    case 'INVITED': return C.warning;
    case 'DECLINED': return C.error;
    case 'PUBLISHED': return '#3b82f6';
    case 'COMPLETED': return C.success;
    default: return C.tMuted;
  }
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
  greeting: { fontSize: 13, color: C.tMuted },
  name: { fontSize: 22, fontWeight: '800', color: C.t1 },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, backgroundColor: C.card, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: C.error },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginBottom: 8 },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, gap: 6 },
  statIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 24, fontWeight: '800', color: C.t1 },
  statLbl: { fontSize: 11, color: C.tMuted, lineHeight: 15 },
  section: { paddingHorizontal: 16, paddingTop: 20, gap: 12, paddingBottom: 8 },
  sectionHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  seeAll: { fontSize: 13, color: C.primary, fontWeight: '600' },
  emptyCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 32, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, color: C.tMuted },
  enrollBtn: { backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  enrollBtnTxt: { color: C.white, fontSize: 14, fontWeight: '700' },
  courseCard: { width: 200, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, gap: 8 },
  courseTag: { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  courseTagTxt: { fontSize: 10, fontWeight: '700' },
  courseTitle: { fontSize: 14, fontWeight: '700', color: C.t1, lineHeight: 20 },
  statusRow: { flexDirection: 'row' },
  statusBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeTxt: { fontSize: 10, fontWeight: '700' },
  durRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  durTxt: { fontSize: 12, color: C.tMuted },
  perfCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, gap: 12 },
  perfRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  perfLabel: { fontSize: 14, color: C.tMuted },
  perfValue: { fontSize: 16, fontWeight: '700', color: C.t1 },
});
