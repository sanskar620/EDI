import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import courseService from '../../services/courseService';
import authService from '../../services/authService';
import { API_BASE_URL } from '../../services/api';

export default function ManageCoursesScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const [tab, setTab] = useState<'list' | 'create'>('list');
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [duration, setDuration] = useState('');

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    setLoading(true);
    const res = await courseService.getAllCourses();
    if (res.success && res.data) setCourses(res.data);
    setLoading(false);
  };

  const handleCreateCourse = async () => {
    if (!title.trim() || !category.trim()) {
      Alert.alert('Error', 'Title and Category are required');
      return;
    }
    setLoading(true);
    const res = await courseService.createCourse({
      title: title.trim(),
      description: description.trim() || null,
      topic: category.trim(),
      status: 'PUBLISHED',
    });
    setLoading(false);
    if (!res.success) {
      Alert.alert('Error', res.error || 'Failed to create course');
    } else {
      Alert.alert('✅ Course Created', title);
      setTitle(''); setDescription(''); setCategory(''); setDuration('');
      setTab('list');
      fetchCourses();
    }
  };

  const handleDeleteCourse = (course: any) => {
    Alert.alert(
      'Delete Course',
      `Are you sure you want to permanently delete "${course.title}"? This will also remove all materials and enrollments associated with it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const token = authService.getAuthToken();
              const response = await fetch(`${API_BASE_URL}/courses/${course.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const res = await response.json();
              if (res.success) {
                Alert.alert('Deleted', 'Course permanently deleted');
                fetchCourses();
              } else {
                Alert.alert('Error', res.error || res.detail || 'Failed to delete course');
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const categories = ['Compliance', 'Technology', 'Safety', 'Leadership', 'HR', 'Operations'];

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Manage Courses</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabBtn, tab === 'list' && s.tabBtnActive]} onPress={() => setTab('list')}>
          <MaterialIcons name="list" size={18} color={tab === 'list' ? '#fff' : C.tMuted} />
          <Text style={[s.tabTxt, tab === 'list' && s.tabTxtActive]}>View Courses</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === 'create' && s.tabBtnActive]} onPress={() => setTab('create')}>
          <MaterialIcons name="add" size={18} color={tab === 'create' ? '#fff' : C.tMuted} />
          <Text style={[s.tabTxt, tab === 'create' && s.tabTxtActive]}>Create Course</Text>
        </TouchableOpacity>
      </View>

      {tab === 'list' ? (
        <FlatList
          data={courses}
          keyExtractor={item => item.id?.toString()}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshing={loading}
          onRefresh={fetchCourses}
          ListEmptyComponent={<Text style={s.emptyTxt}>No courses found</Text>}
          renderItem={({ item }) => (
            <View style={s.courseCard}>
              <View style={[s.topicBadge, { backgroundColor: '#f59e0b18' }]}>
                <Text style={[s.topicTxt, { color: '#f59e0b' }]}>{item.topic || 'General'}</Text>
              </View>
              <Text style={s.courseTitle}>{item.title}</Text>
              {item.description && <Text style={s.courseDesc} numberOfLines={2}>{item.description}</Text>}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Text style={s.courseMeta}>{item.status}</Text>
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary + '15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                  onPress={() => navigation.navigate('CourseDetail', { courseId: item.id, enrollment: { course: item } })}
                >
                  <MaterialIcons name="visibility" size={16} color={C.primary} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.primary }}>View Materials</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.error + '22', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                  onPress={() => handleDeleteCourse(item)}
                >
                  <MaterialIcons name="delete-outline" size={16} color={C.error} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <Text style={s.formTitle}>📚 Create New Course</Text>
          <Text style={s.label}>Course Title *</Text>
          <TextInput style={s.input} placeholder="e.g. Fire Safety Training" placeholderTextColor={C.tMuted} value={title} onChangeText={setTitle} />
          <Text style={s.label}>Description</Text>
          <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Course description..." placeholderTextColor={C.tMuted} value={description} onChangeText={setDescription} multiline />
          <Text style={s.label}>Category *</Text>
          <View style={s.chipRow}>
            {categories.map(c => (
              <TouchableOpacity key={c} style={[s.chip, category === c && s.chipActive]} onPress={() => setCategory(c)}>
                <Text style={[s.chipTxt, category === c && s.chipTxtActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.label}>Duration (hours)</Text>
          <TextInput style={s.input} placeholder="e.g. 2" placeholderTextColor={C.tMuted} value={duration} onChangeText={setDuration} keyboardType="numeric" />
          <TouchableOpacity style={s.saveBtn} onPress={handleCreateCourse} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <><MaterialIcons name="save" size={20} color="#fff" /><Text style={s.saveBtnTxt}>Create Course</Text></>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 8 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  tabBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabTxt: { fontSize: 13, fontWeight: '700', color: C.tMuted },
  tabTxtActive: { color: '#fff' },
  courseCard: { backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, gap: 6 },
  topicBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  topicTxt: { fontSize: 10, fontWeight: '800' },
  courseTitle: { fontSize: 16, fontWeight: '700', color: C.t1 },
  courseDesc: { fontSize: 13, color: C.tMuted },
  courseMeta: { fontSize: 11, color: C.tMuted },
  emptyTxt: { textAlign: 'center', color: C.tMuted, fontSize: 14, marginTop: 40 },
  formTitle: { fontSize: 20, fontWeight: '800', color: C.t1 },
  label: { fontSize: 13, fontWeight: '600', color: C.tMuted, marginTop: 4 },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.t1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipTxt: { fontSize: 13, fontWeight: '600', color: C.tMuted },
  chipTxtActive: { color: '#fff' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, marginTop: 12 },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
