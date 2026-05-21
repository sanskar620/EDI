import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useSessionsStore } from '../../stores/sessionsStore';
import { useEnrollmentStore } from '../../stores/enrollmentStore';
import { useReportingStore } from '../../stores/reportingStore';

type TabType = 'attended' | 'attending' | 'upcoming';

export default function CoursesScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user } = useAuthStore();
  const { sessions, fetchSessions, isLoading: sessionsLoading } = useSessionsStore();
  const { userEnrollments, fetchUserEnrollments, enrollUser, isLoading: enrollLoading } = useEnrollmentStore();
  const { userPerformance, fetchUserPerformance } = useReportingStore();
  const [tab, setTab] = useState<TabType>('upcoming');

  const fetchAllData = useCallback(() => {
    if (user?.id) {
      // Always fetch enrolled sessions + all sessions for reference
      fetchUserEnrollments(user.id);
      fetchSessions();
      fetchUserPerformance(user.id);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchAllData();
    }, [fetchAllData])
  );

  const handleEnroll = async (sessionId: number) => {
    if (!user?.id) return;
    Alert.alert('Enroll', 'Do you want to enroll in this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Enroll',
        onPress: async () => {
          const success = await enrollUser(sessionId, user.id);
          if (success) {
            Alert.alert('Success', 'You have been enrolled!');
            fetchUserEnrollments(user.id);
          } else {
            Alert.alert('Error', 'Failed to enroll. Please try again.');
          }
        },
      },
    ]);
  };

  const isLoading = sessionsLoading || enrollLoading;

  // Normalize enrolled sessions from /my-enrollments (session_ prefixed fields)
  const enrolledSessions = userEnrollments.map((e: any) => ({
    enrollment_id: e.id,
    enrollment_status: e.status,
    id: e.session_id ?? e.id,
    title: e.session_title ?? e.title,
    topic: e.session_topic ?? e.topic ?? 'GENERAL',
    scheduled_date: e.session_scheduled_date ?? e.scheduled_date,
    start_time: e.session_start_time ?? e.start_time,
    end_time: e.session_end_time ?? e.end_time,
    venue_name: e.session_venue ?? e.venue_name,
    status: e.session_status ?? e.status,
    description: e.description,
    trainer_name: e.trainer_name,
    pre_test_enabled: e.pre_test_enabled,
    post_test_enabled: e.post_test_enabled,
  }));

  const enrolledSessionIds = new Set(enrolledSessions.map((s: any) => s.id));

  // Date boundaries (midnight)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const getFilteredSessions = () => {
    if (tab === 'upcoming') {
      return enrolledSessions.filter((s: any) => {
        if (!s.scheduled_date) return false;
        const d = new Date(s.scheduled_date);
        d.setHours(0, 0, 0, 0);
        return d >= tomorrow;
      });
    }
    if (tab === 'attending') {
      return enrolledSessions.filter((s: any) => {
        if (!s.scheduled_date) return false;
        const d = new Date(s.scheduled_date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      });
    }
    if (tab === 'attended') {
      return enrolledSessions.filter((s: any) => {
        if (!s.scheduled_date) return false;
        const d = new Date(s.scheduled_date);
        d.setHours(0, 0, 0, 0);
        return d < today;
      });
    }
    return enrolledSessions;
  };

  const filteredSessions = getFilteredSessions();

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'attended', label: 'Attended', icon: 'check-circle' },
    { key: 'attending', label: 'Attending', icon: 'school' },
    { key: 'upcoming', label: 'Upcoming', icon: 'event' },
  ];

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.headerTitle}>My Sessions</Text>
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
            <MaterialIcons name={tabs.find(t => t.key === tab)?.icon || 'school'} size={48} color={C.tMuted} />
            <Text style={s.emptyTitle}>
              {tab === 'upcoming' ? 'No upcoming courses' : 
               tab === 'attending' ? 'No sessions today' : 
               'No attended courses yet'}
            </Text>
            <Text style={s.emptyText}>
              {tab === 'upcoming' ? 'Check back later for new courses' : 
               tab === 'attending' ? 'Your active sessions will appear here' : 
               'Attend sessions to see them here'}
            </Text>
          </View>
        ) : (
          <View style={s.list}>
            {filteredSessions.map((session: any) => {
              const isEnrolled = enrolledSessionIds.has(session.id);
              const sessionDate = new Date(session.scheduled_date);
              const isToday = sessionDate.toDateString() === new Date().toDateString();

              return (
                <TouchableOpacity
                  key={session.id}
                  style={s.card}
                  onPress={() => navigation.navigate('LearningPath', { session })}
                >
                  <View style={s.cardHeader}>
                    <View style={[s.topicBadge, { backgroundColor: getTopicColor(session.topic) + '22' }]}>
                      <Text style={[s.topicTxt, { color: getTopicColor(session.topic) }]}>
                        {(session.topic || 'General').toUpperCase()}
                      </Text>
                    </View>
                    {isToday && (
                      <View style={[s.statusBadge, { backgroundColor: '#10b981' + '22' }]}>
                        <Text style={[s.statusTxt, { color: '#10b981' }]}>TODAY</Text>
                      </View>
                    )}
                    {!isToday && (
                      <View style={[s.statusBadge, { backgroundColor: getStatusColor(session.enrollment_status || session.status) + '22' }]}>
                        <Text style={[s.statusTxt, { color: getStatusColor(session.enrollment_status || session.status) }]}>
                          {session.enrollment_status || session.status}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={s.cardTitle} numberOfLines={2}>{session.title}</Text>
                  {session.description && (
                    <Text style={s.cardDesc} numberOfLines={2}>{session.description}</Text>
                  )}

                  <View style={s.cardMeta}>
                    <View style={s.metaItem}>
                      <MaterialIcons name="person" size={14} color={C.tMuted} />
                      <Text style={s.metaTxt}>{session.trainer_name || 'TBD'}</Text>
                    </View>
                    <View style={s.metaItem}>
                      <MaterialIcons name="schedule" size={14} color={C.tMuted} />
                      <Text style={s.metaTxt}>
                        {session.scheduled_date ? new Date(session.scheduled_date).toLocaleDateString() : 'TBD'}
                      </Text>
                    </View>
                    <View style={s.metaItem}>
                      <MaterialIcons name="location-on" size={14} color={C.tMuted} />
                      <Text style={s.metaTxt}>{session.venue_name || 'TBD'}</Text>
                    </View>
                  </View>

                  {/* ═══════════════════════════════════════════ */}
                  {/* UPCOMING TAB - Enroll Button */}
                  {/* ═══════════════════════════════════════════ */}
                  {tab === 'upcoming' && (
                    <TouchableOpacity 
                      style={[s.enrollBtn, isEnrolled && { backgroundColor: C.border }]} 
                      onPress={() => isEnrolled ? Alert.alert('Already Enrolled', 'You have already enrolled in this session.') : handleEnroll(session.id)}
                    >
                      <MaterialIcons name={isEnrolled ? "check-circle" : "add"} size={18} color={isEnrolled ? C.success : C.white} />
                      <Text style={[s.enrollBtnTxt, isEnrolled && { color: C.t1 }]}>{isEnrolled ? 'Enrolled' : 'Enroll Now'}</Text>
                    </TouchableOpacity>
                  )}

                  {/* ═══════════════════════════════════════════ */}
                  {/* ATTENDING TAB - Mark Attendance Button (ONLY HERE) */}
                  {/* ═══════════════════════════════════════════ */}
                  {tab === 'attending' && isEnrolled && (
                    <View style={s.actionRow}>
                      {/* Mark Attendance Button - Primary action for attending sessions */}
                      {(() => {
                        let canMarkAttendance = false;
                        let isPastEnd = false;
                        try {
                          const sessionStart = new Date(`${session.scheduled_date.split('T')[0]}T${session.start_time}`);
                          const sessionEnd = new Date(`${session.scheduled_date.split('T')[0]}T${session.end_time}`);
                          const now = new Date();
                          const startTimeMs = sessionStart.getTime(); // Exactly at start time
                          const endTimeMs = sessionEnd.getTime();
                          
                          if (now.getTime() >= startTimeMs && now.getTime() <= endTimeMs) {
                            canMarkAttendance = true;
                          } else if (now.getTime() > endTimeMs) {
                            isPastEnd = true;
                          }
                        } catch (e) {}
                        
                        if (isPastEnd) {
                           return (
                             <View style={[s.actionBtn, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}>
                               <MaterialIcons name="event-busy" size={16} color={C.error} />
                               <Text style={[s.actionBtnTxt, { color: C.error }]}>Attendance not available for session</Text>
                             </View>
                           );
                        }

                        return canMarkAttendance ? (
                          <TouchableOpacity 
                            style={[s.actionBtn, s.actionBtnPrimary]}
                            onPress={() => navigation.navigate('AttendanceCheckin', { sessionId: session.id, session })}
                          >
                            <MaterialIcons name="how-to-reg" size={16} color={C.white} />
                            <Text style={[s.actionBtnTxt, { color: C.white }]}>Mark Attendance</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={[s.actionBtn, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}>
                            <MaterialIcons name="schedule" size={16} color={C.tMuted} />
                            <Text style={[s.actionBtnTxt, { color: C.tMuted }]}>Starts at {session.start_time ? new Date(`${session.scheduled_date.split('T')[0]}T${session.start_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}</Text>
                          </View>
                        );
                      })()}
                      
                      {/* Pre-Test Button */}
                      {session.pre_test_enabled && (
                        userPerformance?.assessment_history?.find((a: any) => a.session_id === session.id && a.assessment_type === 'PRE_TEST') ? (
                          <View style={[s.actionBtn, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}>
                            <MaterialIcons name="fact-check" size={16} color={C.success} />
                            <Text style={[s.actionBtnTxt, { color: C.success }]}>
                              Pre-Test: {userPerformance.assessment_history.find((a: any) => a.session_id === session.id && a.assessment_type === 'PRE_TEST').score_percentage}%
                            </Text>
                          </View>
                        ) : (
                          <TouchableOpacity 
                            style={s.actionBtn}
                            onPress={() => navigation.navigate('Quiz', { sessionId: session.id, type: 'PRE_TEST', topic: session.topic })}
                          >
                            <MaterialIcons name="assignment" size={16} color={C.primary} />
                            <Text style={s.actionBtnTxt}>Pre-Test</Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                  )}

                  {/* ═══════════════════════════════════════════ */}
                  {/* ATTENDED TAB - View Details & Certificate */}
                  {/* ═══════════════════════════════════════════ */}
                  {tab === 'attended' && (
                    <View style={s.actionRow}>
                      {/* View Certificate */}
                      <TouchableOpacity 
                        style={s.actionBtn}
                        onPress={() => navigation.navigate('Certificates', { sessionId: session.id })}
                      >
                        <MaterialIcons name="verified" size={16} color={C.success} />
                        <Text style={s.actionBtnTxt}>Certificate</Text>
                      </TouchableOpacity>
                      
                      {/* Session Evaluation */}
                      <TouchableOpacity 
                        style={s.actionBtn}
                        onPress={() => navigation.navigate('SessionEvaluation', { sessionId: session.id })}
                      >
                        <MaterialIcons name="rate-review" size={16} color={C.primary} />
                        <Text style={s.actionBtnTxt}>Feedback</Text>
                      </TouchableOpacity>
                      
                      {/* Post-Test Button */}
                      {session.post_test_enabled && (
                        userPerformance?.assessment_history?.find((a: any) => a.session_id === session.id && a.assessment_type === 'POST_TEST') ? (
                          <View style={[s.actionBtn, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}>
                            <MaterialIcons name="fact-check" size={16} color={C.success} />
                            <Text style={[s.actionBtnTxt, { color: C.success }]}>
                              Score: {userPerformance.assessment_history.find((a: any) => a.session_id === session.id && a.assessment_type === 'POST_TEST').score_percentage}%
                            </Text>
                          </View>
                        ) : (
                          <TouchableOpacity 
                            style={s.actionBtn}
                            onPress={() => navigation.navigate('Quiz', { sessionId: session.id, type: 'POST_TEST', topic: session.topic })}
                          >
                            <MaterialIcons name="quiz" size={16} color={C.primary} />
                            <Text style={s.actionBtnTxt}>Post-Test</Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function getTopicColor(topic: string): string {
  const map: Record<string, string> = { 'Fire Safety': '#ef4444', 'Compliance': '#ef4444', 'Technical': '#3b82f6', 'Leadership': '#10b981' };
  return map[topic] || '#3b82f6';
}

function getStatusColor(status: string): string {
  switch (status) { 
    case 'ATTENDED': return '#10b981'; 
    case 'ACCEPTED': return '#3b82f6'; 
    case 'INVITED': return '#f59e0b'; 
    case 'DECLINED': return '#ef4444'; 
    case 'PUBLISHED': return '#3b82f6'; 
    case 'COMPLETED': return '#10b981';
    default: return '#94a3b8'; 
  }
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.t1 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: { flex: 1, flexDirection: 'row', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  tabActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabTxt: { fontSize: 12, fontWeight: '700', color: C.tMuted },
  tabTxtActive: { color: C.white },
  list: { paddingHorizontal: 16, gap: 12, paddingTop: 8 },
  card: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, gap: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topicBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  topicTxt: { fontSize: 10, fontWeight: '700' },
  statusBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  statusTxt: { fontSize: 10, fontWeight: '700' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.t1, lineHeight: 22 },
  cardDesc: { fontSize: 13, color: C.tMuted, lineHeight: 18 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { fontSize: 12, color: C.tMuted },
  enrollBtn: { flexDirection: 'row', backgroundColor: C.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 6 },
  enrollBtnTxt: { color: C.white, fontSize: 14, fontWeight: '700' },
  enrolledBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  enrolledTxt: { fontSize: 13, color: C.success, fontWeight: '600' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  actionBtnPrimary: { backgroundColor: C.primary, borderColor: C.primary },
  actionBtnTxt: { fontSize: 12, fontWeight: '600', color: C.primary },
  emptyCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.t1, textAlign: 'center' },
  emptyText: { fontSize: 14, color: C.tMuted, textAlign: 'center', lineHeight: 20 },
});
