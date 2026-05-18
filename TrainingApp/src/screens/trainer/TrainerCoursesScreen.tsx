import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useCourseStore } from '../../stores/courseStore';
import { useSessionsStore } from '../../stores/sessionsStore';

export default function TrainerCoursesScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user } = useAuthStore();
  const { isLoading: coursesLoading } = useCourseStore();
  const { sessions, fetchSessions } = useSessionsStore();

  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchSessions({ trainerId: user.id });
      }
    }, [user?.id])
  );

  const derivedCourses = React.useMemo(() => {
    const map = new Map<string, any>();
    sessions.forEach((session: any) => {
      const topicName = session.topic || session.title;
      if (!map.has(topicName)) {
        map.set(topicName, {
          id: topicName, // use topic name as unique ID for the accordion
          title: topicName,
          topic: session.topic || 'General',
          status: session.status,
          created_at: session.created_at,
          sessions: []
        });
      }
      map.get(topicName).sessions.push(session);
    });
    return Array.from(map.values());
  }, [sessions]);

  const getTopicColor = (topic: string) => {
    const map: Record<string, string> = {
      Compliance: '#ef4444', Technology: '#3b82f6', Safety: '#f59e0b',
      Leadership: '#10b981', HR: '#8b5cf6', Operations: '#06b6d4',
    };
    return map[topic] || '#6b7280';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return '#10b981';
      case 'DRAFT': return '#f59e0b';
      case 'ARCHIVED': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>My Courses</Text>
          <Text style={s.headerSub}>{derivedCourses.length} assigned courses</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {coursesLoading && derivedCourses.length === 0 ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
        ) : derivedCourses.length === 0 ? (
          <View style={s.emptyCard}>
            <MaterialIcons name="library-books" size={56} color={C.tMuted} />
            <Text style={s.emptyTitle}>No Courses Assigned</Text>
            <Text style={s.emptyText}>Courses will appear here once assigned by the supervisor.</Text>
          </View>
        ) : (
          <View style={s.list}>
            {derivedCourses.map((course: any) => {
              const courseSessions = course.sessions;
              const isExpanded = expandedCourse === course.id;

              return (
                <View key={course.id} style={s.card}>
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => setExpandedCourse(isExpanded ? null : course.id)}
                  >
                    <View style={s.cardTop}>
                      <View style={[s.topicBadge, { backgroundColor: getTopicColor(course.topic) + '18' }]}>
                        <Text style={[s.topicTxt, { color: getTopicColor(course.topic) }]}>
                          {(course.topic || 'General').toUpperCase()}
                        </Text>
                      </View>
                      <View style={[s.statusBadge, { backgroundColor: getStatusColor(course.status) + '18' }]}>
                        <View style={[s.statusDot, { backgroundColor: getStatusColor(course.status) }]} />
                        <Text style={[s.statusTxt, { color: getStatusColor(course.status) }]}>
                          {course.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={s.cardTitle} numberOfLines={2}>{course.title}</Text>
                    {course.description && (
                      <Text style={s.cardDesc} numberOfLines={2}>{course.description}</Text>
                    )}

                    <View style={[s.cardFooter, { justifyContent: 'space-between', alignItems: 'center' }]}>
                      <View style={s.metaItem}>
                        <MaterialIcons name="calendar-today" size={14} color={C.tMuted} />
                        <Text style={s.metaTxt}>
                          {new Date(course.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {/* We don't have a course ID to navigate to CourseDetail, so we just expand sessions */}
                        <MaterialIcons name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={24} color={C.tMuted} />
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Sessions Accordion */}
                  {isExpanded && (
                    <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: C.t1, marginBottom: 8 }}>Assigned Sessions ({courseSessions.length})</Text>
                      {courseSessions.length === 0 ? (
                        <Text style={{ fontSize: 13, color: C.tMuted, fontStyle: 'italic' }}>No sessions assigned for this course.</Text>
                      ) : (
                        courseSessions.map((session: any) => (
                          <TouchableOpacity 
                            key={session.id}
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bg, padding: 10, borderRadius: 8, marginBottom: 6 }}
                            onPress={() => navigation.navigate('SessionDetails', { sessionId: session.id })}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: '600', color: C.t1, marginBottom: 2 }}>{session.title}</Text>
                              <Text style={{ fontSize: 12, color: C.tMuted }}>{new Date(session.scheduled_date).toLocaleDateString()} • {session.venue_name || 'TBD'}</Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={20} color={C.tMuted} />
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>

  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.t1 },
  headerSub: { fontSize: 13, color: C.tMuted, marginTop: 2 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  createBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  list: { paddingHorizontal: 16, gap: 14, paddingTop: 8 },
  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 18, gap: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topicBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  topicTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 10, fontWeight: '700' },
  cardTitle: { fontSize: 17, fontWeight: '800', color: C.t1, lineHeight: 22 },
  cardDesc: { fontSize: 13, color: C.tMuted, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { fontSize: 12, color: C.tMuted },
  emptyCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 14 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: C.t1 },
  emptyText: { fontSize: 14, color: C.tMuted, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
