import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useSessionsStore } from '../../stores/sessionsStore';

type TabType = 'attended' | 'attending' | 'upcoming';

export default function ScheduleScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user } = useAuthStore();
  const { sessions, isLoading, fetchSessions } = useSessionsStore();
  const [tab, setTab] = useState<TabType>('upcoming');

  // Reload sessions every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        // Fetch sessions assigned to this trainer
        fetchSessions({ trainerId: user.id, role: 'TRAINER', currentUserId: user.id });
      }
    }, [user?.id])
  );

  // Get today's date at midnight for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const getFilteredSessions = () => {
    if (tab === 'upcoming') {
      return sessions.filter((s: any) => {
        const sessionDate = new Date(s.scheduled_date);
        return sessionDate.setHours(0,0,0,0) > today.getTime();
      });
    }
    if (tab === 'attending') {
      return sessions.filter((s: any) => {
        const sessionDate = new Date(s.scheduled_date);
        return sessionDate.setHours(0,0,0,0) === today.getTime();
      });
    }
    if (tab === 'attended') {
      return sessions.filter((s: any) => {
        const sessionDate = new Date(s.scheduled_date);
        return sessionDate.setHours(0,0,0,0) < today.getTime();
      });
    }
    return sessions;
  };

  const filteredSessions = getFilteredSessions();

  // Group filtered sessions by date
  const grouped = filteredSessions.reduce((acc: any, session: any) => {
    const date = session.scheduled_date
      ? new Date(session.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : 'Unscheduled';
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {});

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'attended', label: 'Attended', icon: 'check-circle' },
    { key: 'attending', label: 'Attending', icon: 'school' },
    { key: 'upcoming', label: 'Upcoming', icon: 'event' },
  ];

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.headerTitle}>My Schedule</Text>
      </View>

      {/* Tab bar */}
      <View style={s.tabRow}>
        {tabs.map((t) => (
          <TouchableOpacity 
            key={t.key}
            style={[s.tab, tab === t.key && s.tabActive]} 
            onPress={() => setTab(t.key)}
          >
            <MaterialIcons name={t.icon} size={18} color={tab === t.key ? C.white : C.tMuted} />
            <Text style={[s.tabTxt, tab === t.key && s.tabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
        ) : filteredSessions.length === 0 ? (
          <View style={s.emptyCard}>
            <MaterialIcons name="event-note" size={48} color={C.tMuted} />
            <Text style={s.emptyTitle}>
              {tab === 'upcoming' ? 'No upcoming sessions' : tab === 'attending' ? 'No sessions today' : 'No past sessions'}
            </Text>
            <Text style={s.emptyText}>
              {tab === 'upcoming' ? 'Wait for a supervisor to assign you a session' : tab === 'attending' ? 'Sessions scheduled for today will appear here' : 'Completed sessions will appear here'}
            </Text>
          </View>
        ) : (
          <View style={s.list}>
            {Object.entries(grouped).map(([date, dateSessions]: [string, any]) => (
              <View key={date}>
                <Text style={s.dateHeader}>{date}</Text>
                {dateSessions.map((session: any) => (
                  <TouchableOpacity
                    key={session.id}
                    style={s.card}
                    onPress={() => navigation.navigate('SessionDetails', { sessionId: session.id })}
                  >
                    <View style={[s.timeBar, { backgroundColor: getStatusColor(session.status) }]} />
                    <View style={s.cardContent}>
                      <View style={s.cardTop}>
                        <Text style={s.cardTitle} numberOfLines={1}>{session.title}</Text>
                        <View style={[s.statusBadge, { backgroundColor: getStatusColor(session.status) + '22' }]}>
                          <Text style={[s.statusTxt, { color: getStatusColor(session.status) }]}>{session.status}</Text>
                        </View>
                      </View>
                      <View style={s.metaRow}>
                        <MaterialIcons name="schedule" size={14} color={C.tMuted} />
                        <Text style={s.metaTxt}>
                          {session.start_time ? new Date(session.start_time.replace('T', ' ').replace(/-/g, '/')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                          {' - '}
                          {session.end_time ? new Date(session.end_time.replace('T', ' ').replace(/-/g, '/')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                        </Text>
                      </View>
                      <View style={s.metaRow}>
                        <MaterialIcons name="location-on" size={14} color={C.tMuted} />
                        <Text style={s.metaTxt}>{session.venue_name || 'TBD'}</Text>
                      </View>
                      <View style={s.metaRow}>
                        <MaterialIcons name="groups" size={14} color={C.tMuted} />
                        <Text style={s.metaTxt}>{session.enrolled_count || 0} / {session.max_capacity || '∞'} enrolled</Text>
                      </View>
                      {/* Action buttons */}
                      <View style={s.actionRow}>
                        {tab === 'attending' && (
                          <TouchableOpacity 
                            style={s.actionBtn}
                            onPress={() => navigation.navigate('LiveAttendance', { sessionId: session.id, session })}
                          >
                            <MaterialIcons name="how-to-reg" size={16} color={C.primary} />
                            <Text style={s.actionBtnTxt}>Mark Attendance</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                          style={s.actionBtn}
                          onPress={() => navigation.navigate('QuizBuilder', { sessionId: session.id })}
                        >
                          <MaterialIcons name="quiz" size={16} color={C.primary} />
                          <Text style={s.actionBtnTxt}>Questions</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.t1 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: { flex: 1, flexDirection: 'row', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  tabActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabTxt: { fontSize: 12, fontWeight: '700', color: C.tMuted },
  tabTxtActive: { color: C.white },
  list: { paddingHorizontal: 16, gap: 8 },
  dateHeader: { fontSize: 13, fontWeight: '600', color: C.tMuted, marginTop: 16, marginBottom: 8 },
  card: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 8 },
  timeBar: { width: 4 },
  cardContent: { flex: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.t1, flex: 1, marginRight: 8 },
  statusBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  statusTxt: { fontSize: 10, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaTxt: { fontSize: 12, color: C.tMuted },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  actionBtnTxt: { fontSize: 11, fontWeight: '600', color: C.primary },
  emptyCard: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.t1 },
  emptyText: { fontSize: 13, color: C.tMuted },
  createBtn: { backgroundColor: C.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 8 },
  createBtnTxt: { color: C.white, fontSize: 14, fontWeight: '700' },
});
