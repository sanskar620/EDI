import React, { useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useCourseStore } from '../../stores/courseStore';

export default function TrainerCoursesScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user } = useAuthStore();
  const { courses, fetchTrainerCourses, isLoading } = useCourseStore();

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchTrainerCourses(user.id);
      }
    }, [user?.id])
  );

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
          <Text style={s.headerSub}>{courses.length} courses created</Text>
        </View>
        <TouchableOpacity style={s.createBtn} onPress={() => navigation.navigate('CreateCourseScreen')}>
           <MaterialIcons name="add" size={20} color="#fff" />
           <Text style={s.createBtnTxt}>New Course</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
        ) : courses.length === 0 ? (
          <View style={s.emptyCard}>
            <MaterialIcons name="library-books" size={56} color={C.tMuted} />
            <Text style={s.emptyTitle}>No Courses Found</Text>
            <Text style={s.emptyText}>Create a new course to start adding materials and enrolling trainees.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('CreateCourseScreen')}>
              <Text style={s.emptyBtnTxt}>Create Course</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.list}>
            {courses.map((course: any) => {
              return (
                <View key={course.id} style={s.card}>
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('CourseDetail', { courseId: course.id, enrollment: { course } })}
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary + '15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                        <MaterialIcons name="edit" size={16} color={C.primary} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: C.primary }}>Manage</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
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
