import React, { useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useCourseStore } from '../../stores/courseStore';

export default function MyCoursesScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user } = useAuthStore();
  const { enrolledCourses, fetchEnrolledCourses, isLoading } = useCourseStore();

  useFocusEffect(
    useCallback(() => {
      if (user?.id) fetchEnrolledCourses(user.id);
    }, [user?.id])
  );

  const getTopicColor = (topic: string) => {
    const map: Record<string, string> = {
      Compliance: '#ef4444', Technology: '#3b82f6', Safety: '#f59e0b',
      Leadership: '#10b981', HR: '#8b5cf6', Operations: '#06b6d4', General: '#6b7280',
    };
    return map[topic] || '#3b82f6';
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return '#10b981';
    if (progress >= 40) return '#f59e0b';
    return '#3b82f6';
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.headerTitle}>My Courses</Text>
        <Text style={s.headerSub}>{enrolledCourses.length} courses enrolled</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
        ) : enrolledCourses.length === 0 ? (
          <View style={s.emptyCard}>
            <MaterialIcons name="school" size={56} color={C.tMuted} />
            <Text style={s.emptyTitle}>No Courses Yet</Text>
            <Text style={s.emptyText}>Your enrolled courses will appear here once a trainer assigns them to you.</Text>
          </View>
        ) : (
          <View style={s.list}>
            {enrolledCourses.map((enrollment: any) => {
              const course = enrollment.course;
              if (!course) return null;
              const progress = enrollment.progress || 0;
              const topicColor = getTopicColor(course.topic);
              const progressColor = getProgressColor(progress);

              return (
                <TouchableOpacity
                  key={enrollment.id}
                  style={s.card}
                  onPress={() => navigation.navigate('CourseDetail', { courseId: course.id, enrollment })}
                >
                  {/* Topic & Status */}
                  <View style={s.cardTop}>
                    <View style={[s.topicBadge, { backgroundColor: topicColor + '18' }]}>
                      <Text style={[s.topicTxt, { color: topicColor }]}>{(course.topic || 'General').toUpperCase()}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: enrollment.status === 'COMPLETED' ? '#10b98118' : '#3b82f618' }]}>
                      <Text style={[s.statusTxt, { color: enrollment.status === 'COMPLETED' ? '#10b981' : '#3b82f6' }]}>
                        {enrollment.status}
                      </Text>
                    </View>
                  </View>

                  {/* Title & Description */}
                  <Text style={s.cardTitle} numberOfLines={2}>{course.title}</Text>
                  {course.description && (
                    <Text style={s.cardDesc} numberOfLines={2}>{course.description}</Text>
                  )}

                  {/* Progress Bar */}
                  <View style={s.progressSection}>
                    <View style={s.progressBarBg}>
                      <View style={[s.progressBarFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: progressColor }]} />
                    </View>
                    <Text style={[s.progressTxt, { color: progressColor }]}>{Math.round(progress)}%</Text>
                  </View>

                  {/* Meta */}
                  <View style={s.cardMeta}>
                    <View style={s.metaItem}>
                      <MaterialIcons name="play-circle-outline" size={14} color={C.tMuted} />
                      <Text style={s.metaTxt}>Videos & Materials</Text>
                    </View>
                    <View style={s.metaItem}>
                      <MaterialIcons name="quiz" size={14} color={C.tMuted} />
                      <Text style={s.metaTxt}>Quiz Included</Text>
                    </View>
                  </View>

                  {/* CTA */}
                  <View style={s.ctaRow}>
                    <MaterialIcons name="arrow-forward" size={18} color={C.primary} />
                    <Text style={s.ctaTxt}>
                      {progress === 0 ? 'Start Course' : progress >= 100 ? 'Review Course' : 'Continue Learning'}
                    </Text>
                  </View>
                </TouchableOpacity>
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
  header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.t1 },
  headerSub: { fontSize: 13, color: C.tMuted, marginTop: 2 },
  list: { paddingHorizontal: 16, gap: 14, paddingTop: 8 },
  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 18, gap: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topicBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  topicTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusTxt: { fontSize: 10, fontWeight: '700' },
  cardTitle: { fontSize: 17, fontWeight: '800', color: C.t1, lineHeight: 22 },
  cardDesc: { fontSize: 13, color: C.tMuted, lineHeight: 18 },
  progressSection: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBarBg: { flex: 1, height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressTxt: { fontSize: 13, fontWeight: '800', minWidth: 36 },
  cardMeta: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { fontSize: 12, color: C.tMuted },
  ctaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, paddingTop: 4 },
  ctaTxt: { fontSize: 14, fontWeight: '700', color: C.primary },
  emptyCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: C.t1 },
  emptyText: { fontSize: 14, color: C.tMuted, textAlign: 'center', lineHeight: 20 },
});
