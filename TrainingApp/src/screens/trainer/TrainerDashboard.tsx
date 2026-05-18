import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useSessionsStore } from '../../stores/sessionsStore';
import { useReportingStore } from '../../stores/reportingStore';
import { useNotificationStore } from '../../stores/notificationStore';

export default function TrainerDashboard({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user } = useAuthStore();
  const { sessions, isLoading: sessionsLoading, fetchSessions } = useSessionsStore();
  const { trainerReport, fetchTrainerReport, isLoading: reportLoading } = useReportingStore();
  const { unreadCount, fetchUnreadCount } = useNotificationStore();

  useEffect(() => {
    if (user?.id) {
      fetchSessions({ trainerId: user.id, role: 'TRAINER', currentUserId: user.id });
      fetchTrainerReport(user.id);
      fetchUnreadCount(user.id);
    }
  }, [user?.id]);

  const isLoading = sessionsLoading || reportLoading;
  const summary = trainerReport?.summary;

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.avatarWrap}>
          <View style={s.avatarFallback}>
            <Text style={s.avatarText}>{(user?.full_name || 'T').charAt(0)}</Text>
          </View>
        </View>
        <View style={s.headerTextWrap}>
          <Text style={s.greeting}>{getTimeGreeting()},</Text>
          <Text style={s.name}>{user?.full_name || 'Trainer'}</Text>
        </View>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('CommsScreen')}>
          <MaterialIcons name="notifications" size={24} color={C.t1} />
          {unreadCount > 0 && <View style={s.notifDot} />}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* KPI Grid */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Performance Overview</Text>
              <View style={s.kpiGrid}>
                <View style={[s.kpiCard, { backgroundColor: 'rgba(0,86,178,0.1)', borderColor: 'rgba(0,86,178,0.2)' }]}>
                  <View style={s.kpiTop}>
                    <MaterialIcons name="fitness-center" size={24} color={C.primary} />
                  </View>
                  <Text style={s.kpiLabel}>Total Sessions</Text>
                  <Text style={s.kpiVal}>{summary?.total_sessions || 0}</Text>
                </View>

                <View style={s.kpiCard}>
                  <View style={s.kpiTop}>
                    <MaterialIcons name="how-to-reg" size={24} color={C.primary} />
                  </View>
                  <Text style={s.kpiLabel}>Completed</Text>
                  <Text style={s.kpiVal}>{summary?.completed_sessions || 0}</Text>
                </View>

                <View style={s.kpiCard}>
                  <View style={s.kpiTop}>
                    <MaterialIcons name="groups" size={24} color={C.primary} />
                  </View>
                  <Text style={s.kpiLabel}>Trainees Trained</Text>
                  <Text style={s.kpiVal}>{summary?.total_trainees_trained || 0}</Text>
                </View>

                <View style={s.kpiCard}>
                  <View style={s.kpiTop}>
                    <MaterialIcons name="upload-file" size={24} color={C.primary} />
                  </View>
                  <Text style={s.kpiLabel}>Materials</Text>
                  <Text style={s.kpiVal}>{summary?.materials_uploaded || 0}</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Quick Actions</Text>
              <View style={s.actionGrid}>
                <TouchableOpacity style={s.actionBtnPrimary} onPress={() => navigation.navigate('ScheduleTab')}>
                  <MaterialIcons name="event" size={32} color={C.white} />
                  <Text style={s.actionBtnPrimaryTxt}>My Sessions</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtnPrimary} onPress={() => navigation.navigate('CoursesTab')}>
                  <MaterialIcons name="menu-book" size={32} color={C.white} />
                  <Text style={s.actionBtnPrimaryTxt}>My Courses</Text>
                </TouchableOpacity>
              </View>
              <View style={[s.actionGrid, { marginTop: 12 }]}>
                <TouchableOpacity style={s.actionBtnSecondary} onPress={() => navigation.navigate('Performance')}>
                  <MaterialIcons name="bar-chart" size={32} color={C.primary} />
                  <Text style={s.actionBtnSecondaryTxt}>Performance</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtnSecondary} onPress={() => navigation.navigate('TraineesTab')}>
                  <MaterialIcons name="groups" size={32} color={C.primary} />
                  <Text style={s.actionBtnSecondaryTxt}>My Trainees</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Sessions */}
            <View style={s.section}>
              <View style={s.activityHeader}>
                <Text style={s.sectionTitle}>Recent Sessions</Text>
                <TouchableOpacity onPress={() => navigation.navigate('ScheduleTab')}>
                  <Text style={s.seeAllTxt}>See all</Text>
                </TouchableOpacity>
              </View>
              {sessions.length === 0 ? (
                <View style={s.emptyCard}>
                  <MaterialIcons name="event-note" size={40} color={C.tMuted} />
                  <Text style={s.emptyTxt}>No sessions assigned yet</Text>
                </View>
              ) : (
                <View style={s.activityList}>
                  {sessions.slice(0, 5).map((session: any) => (
                    <TouchableOpacity
                      key={session.id}
                      style={s.activityCard}
                      onPress={() => navigation.navigate('SessionDetails', { sessionId: session.id })}
                    >
                      <View style={[s.activityIcon, { backgroundColor: getStatusBg(session.status) }]}>
                        <MaterialIcons name={getStatusIcon(session.status)} size={24} color={getStatusIconColor(session.status, C)} />
                      </View>
                      <View style={s.activityBody}>
                        <Text style={s.activityTitle} numberOfLines={1}>{session.title}</Text>
                        <Text style={s.activitySub} numberOfLines={1}>
                          {session.enrolled_count || 0} enrolled • {session.venue_name || 'TBD'}
                        </Text>
                      </View>
                      <View>
                        <Text style={s.activityTime}>
                          {session.scheduled_date ? new Date(session.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
                        </Text>
                        <View style={[s.statusDot, { backgroundColor: getStatusIconColor(session.status, C) }]} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function getStatusIcon(status: string): any {
  switch (status) {
    case 'COMPLETED': return 'task-alt';
    case 'PUBLISHED': return 'public';
    case 'IN_PROGRESS':
    case 'ONGOING': return 'play-circle-outline';
    case 'DRAFT': return 'edit-note';
    case 'CANCELLED': return 'cancel';
    default: return 'event';
  }
}

function getStatusBg(status: string): string {
  switch (status) {
    case 'COMPLETED': return 'rgba(16,185,129,0.1)';
    case 'PUBLISHED': return 'rgba(59,130,246,0.1)';
    case 'IN_PROGRESS':
    case 'ONGOING': return 'rgba(245,158,11,0.1)';
    case 'DRAFT': return 'rgba(148,163,184,0.1)';
    default: return 'rgba(148,163,184,0.1)';
  }
}

function getStatusIconColor(status: string, C: any): string {
  switch (status) {
    case 'COMPLETED': return C.success;
    case 'PUBLISHED': return '#3b82f6';
    case 'IN_PROGRESS':
    case 'ONGOING': return C.warning;
    case 'CANCELLED': return C.error;
    default: return C.tMuted;
  }
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, backgroundColor: 'rgba(30,41,59,0.5)', borderBottomWidth: 1, borderBottomColor: C.border },
  avatarWrap: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,86,178,0.2)' },
  avatarFallback: { width: '100%', height: '100%', backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.white, fontSize: 18, fontWeight: '700' },
  headerTextWrap: { flex: 1, paddingHorizontal: 12 },
  greeting: { fontSize: 12, color: C.tMuted, fontWeight: '500' },
  name: { fontSize: 16, fontWeight: '700', color: C.t1 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, borderRadius: 8 },
  notifDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  section: { paddingHorizontal: 16, paddingTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.t1, marginBottom: 12 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: { flex: 1, minWidth: '46%', backgroundColor: C.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border },
  kpiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  kpiLabel: { fontSize: 12, fontWeight: '500', color: C.tMuted },
  kpiVal: { fontSize: 24, fontWeight: '800', color: C.t1, marginTop: 4 },
  actionGrid: { flexDirection: 'row', gap: 12 },
  actionBtnPrimary: { flex: 1, height: 112, backgroundColor: C.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionBtnPrimaryTxt: { fontSize: 14, fontWeight: '700', color: C.white },
  actionBtnSecondary: { flex: 1, height: 112, backgroundColor: C.card, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: C.border },
  actionBtnSecondaryTxt: { fontSize: 14, fontWeight: '700', color: C.t1 },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  seeAllTxt: { fontSize: 14, fontWeight: '700', color: C.primary },
  activityList: { gap: 12 },
  activityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  activityIcon: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  activityBody: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '700', color: C.t1, marginBottom: 4 },
  activitySub: { fontSize: 12, color: C.tMuted },
  activityTime: { fontSize: 10, fontWeight: '500', color: C.tMuted, textAlign: 'right', marginBottom: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, alignSelf: 'flex-end' },
  emptyCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 32, alignItems: 'center', gap: 12 },
  emptyTxt: { fontSize: 14, color: C.tMuted },
});
