import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, SectionList, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import sessionsService from '../../services/sessionsService';
import courseService from '../../services/courseService';
import userService from '../../services/userService';

export default function ManageSessionsScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const [tab, setTab] = useState<'list' | 'create'>('list');
  const [sessions, setSessions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [venueName, setVenueName] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('30');
  const [selectedTrainer, setSelectedTrainer] = useState<number | null>(null);
  const [preTest, setPreTest] = useState(true);
  const [postTest, setPostTest] = useState(true);
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [dateObj, setDateObj] = useState(new Date());
  const [startObj, setStartObj] = useState(new Date());
  const [endObj, setEndObj] = useState(new Date());

  // Handover state
  const [handoverSession, setHandoverSession] = useState<any | null>(null);
  const [handoverTrainer, setHandoverTrainer] = useState<number | null>(null);
  const [handoverLoading, setHandoverLoading] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [sessRes, courseRes, trainerRes] = await Promise.all([
      sessionsService.getSessions(),
      courseService.getAllCourses(),
      userService.getTrainers(),
    ]);
    if (sessRes.success && sessRes.data) setSessions(sessRes.data);
    if (courseRes.success && courseRes.data) setCourses(courseRes.data);
    if (trainerRes.success && trainerRes.data) setTrainers(trainerRes.data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!title.trim() || !scheduledDate || !startTime || !endTime || !venueName.trim()) {
      Alert.alert('Error', 'Fill all required fields');
      return;
    }
    setLoading(true);
    const sDate = new Date(scheduledDate);
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const st = new Date(sDate); st.setHours(sH, sM);
    const et = new Date(sDate); et.setHours(eH, eM);

    const formatLocalISO = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const res = await sessionsService.createSession({
      title: title.trim(),
      topic: courses.find(c => c.id === selectedCourse)?.title || title.trim(),
      course_id: selectedCourse,
      scheduled_date: formatLocalISO(sDate),
      start_time: formatLocalISO(st),
      end_time: formatLocalISO(et),
      duration_minutes: Math.round((et.getTime() - st.getTime()) / 60000),
      venue_name: venueName.trim(),
      trainer_id: selectedTrainer,
      max_capacity: parseInt(maxCapacity) || 30,
      pre_test_enabled: preTest,
      post_test_enabled: postTest,
      passing_threshold: 70,
      is_materials_released: false,
      status: 'PUBLISHED',
    } as any);
    setLoading(false);
    if (!res.success) {
      Alert.alert('Error', res.error || 'Failed to create session');
    } else {
      Alert.alert('✅ Session Created', title);
      setTitle(''); setVenueName(''); setSelectedCourse(null); setSelectedTrainer(null);
      setScheduledDate(''); setStartTime(''); setEndTime('');
      setTab('list');
      fetchAll();
    }
  };

  const handleHandover = async () => {
    if (!handoverSession || !handoverTrainer) {
      Alert.alert('Error', 'Please select a trainer');
      return;
    }
    setHandoverLoading(true);
    const res = await sessionsService.updateSession(handoverSession.id, { trainer_id: handoverTrainer } as any);
    setHandoverLoading(false);
    if (!res.success) {
      Alert.alert('Error', res.error || 'Failed to handover');
    } else {
      const trainerName = trainers.find(t => t.id === handoverTrainer)?.full_name || 'Trainer';
      Alert.alert('✅ Handed Over', `Session "${handoverSession.title}" reassigned to ${trainerName}`);
      setHandoverSession(null);
      setHandoverTrainer(null);
      fetchAll();
    }
  };

  const handleDeleteSession = (sessionItem: any) => {
    Alert.alert(
      'Delete Session',
      `Are you sure you want to permanently delete "${sessionItem.title}"? This cannot be undone and will remove all related materials and enrollments.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await sessionsService.deleteSession(sessionItem.id);
              if (res.success) {
                Alert.alert('Deleted', 'Session permanently deleted');
                fetchAll();
              } else {
                Alert.alert('Error', res.error || 'Failed to delete session');
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

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Manage Sessions</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabBtn, tab === 'list' && s.tabBtnActive]} onPress={() => setTab('list')}>
          <Text style={[s.tabTxt, tab === 'list' && s.tabTxtActive]}>View Sessions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === 'create' && s.tabBtnActive]} onPress={() => setTab('create')}>
          <Text style={[s.tabTxt, tab === 'create' && s.tabTxtActive]}>Create Session</Text>
        </TouchableOpacity>
      </View>

      {tab === 'list' ? (
        <SectionList
          sections={[
            {
              title: 'Upcoming & Active Sessions',
              data: sessions.filter(s => !(s.status === 'COMPLETED' || s.status === 'CANCELLED' || (s.end_time && new Date(s.end_time).getTime() < Date.now())))
            },
            {
              title: 'Past Sessions',
              data: sessions.filter(s => (s.status === 'COMPLETED' || s.status === 'CANCELLED' || (s.end_time && new Date(s.end_time).getTime() < Date.now())))
            }
          ].filter(sec => sec.data.length > 0)}
          keyExtractor={item => item.id?.toString()}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshing={loading}
          onRefresh={fetchAll}
          ListEmptyComponent={<Text style={s.emptyTxt}>No sessions found</Text>}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={{ fontSize: 16, fontWeight: '800', color: C.t1, marginTop: 12, marginBottom: 4 }}>{title}</Text>
          )}
          renderItem={({ item }) => (
            <View style={s.sessionCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={[s.statusBadge, { backgroundColor: getColor(item.status) + '18' }]}>
                  <Text style={[s.statusTxt, { color: getColor(item.status) }]}>{item.status}</Text>
                </View>
                <Text style={s.dateTxt}>{item.scheduled_date ? new Date(item.scheduled_date.replace('T', ' ').replace(/-/g, '/')).toLocaleDateString() : ''}</Text>
              </View>
              <Text style={s.sessTitle}>{item.title}</Text>
              <Text style={s.sessMeta}>{item.venue_name || 'No venue'} • {item.max_capacity || 0} seats</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Text style={{ fontSize: 12, color: C.tMuted }}>Trainer: {trainers.find(t => t.id === item.trainer_id)?.full_name || 'Unassigned'}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary + '15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                    onPress={() => { setHandoverSession(item); setHandoverTrainer(null); }}
                  >
                    <MaterialIcons name="swap-horiz" size={16} color={C.primary} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: C.primary }}>Handover</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                    onPress={() => navigation.navigate('SessionDetails', { sessionId: item.id })}
                  >
                    <MaterialIcons name="visibility" size={16} color="#fff" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: "#fff" }}>Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.error + '22', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                    onPress={() => handleDeleteSession(item)}
                  >
                    <MaterialIcons name="delete-outline" size={16} color={C.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Text style={s.formTitle}>📅 Create New Session</Text>

          <Text style={s.label}>Select Course (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {courses.map(c => (
                <TouchableOpacity key={c.id} style={[s.chip, selectedCourse === c.id && s.chipActive]} onPress={() => { setSelectedCourse(c.id); if (!title) setTitle(c.title); }}>
                  <Text style={[s.chipTxt, selectedCourse === c.id && s.chipTxtActive]} numberOfLines={1}>{c.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={s.label}>Session Title *</Text>
          <TextInput style={s.input} placeholder="e.g. Fire Safety Batch 1" placeholderTextColor={C.tMuted} value={title} onChangeText={setTitle} />

          <Text style={s.label}>Date *</Text>
          <TouchableOpacity style={s.pickerBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={s.pickerTxt}>{scheduledDate || 'Select Date'}</Text>
            <MaterialIcons name="calendar-today" size={18} color={C.tMuted} />
          </TouchableOpacity>
          {showDatePicker && <DateTimePicker value={dateObj} mode="date" display="default" minimumDate={new Date()} onChange={(e: any, d?: Date) => { setShowDatePicker(Platform.OS === 'ios'); if (d && e.type !== 'dismissed') { setDateObj(d); const pad = (n: number) => n.toString().padStart(2,'0'); setScheduledDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`); } }} />}

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Start Time *</Text>
              <TouchableOpacity style={s.pickerBtn} onPress={() => setShowStartPicker(true)}>
                <Text style={s.pickerTxt}>{startTime || 'Start'}</Text>
              </TouchableOpacity>
              {showStartPicker && <DateTimePicker value={startObj} mode="time" display="default" onChange={(e: any, d?: Date) => { setShowStartPicker(Platform.OS === 'ios'); if (d && e.type !== 'dismissed') { setStartObj(d); setStartTime(`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`); } }} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>End Time *</Text>
              <TouchableOpacity style={s.pickerBtn} onPress={() => setShowEndPicker(true)}>
                <Text style={s.pickerTxt}>{endTime || 'End'}</Text>
              </TouchableOpacity>
              {showEndPicker && <DateTimePicker value={endObj} mode="time" display="default" onChange={(e: any, d?: Date) => { setShowEndPicker(Platform.OS === 'ios'); if (d && e.type !== 'dismissed') { setEndObj(d); setEndTime(`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`); } }} />}
            </View>
          </View>

          <Text style={s.label}>Venue *</Text>
          <TextInput style={s.input} placeholder="e.g. Training Hall A" placeholderTextColor={C.tMuted} value={venueName} onChangeText={setVenueName} />

          <Text style={s.label}>Assign Trainer</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {trainers.map(t => (
                <TouchableOpacity key={t.id} style={[s.chip, selectedTrainer === t.id && s.chipActive]} onPress={() => setSelectedTrainer(t.id)}>
                  <Text style={[s.chipTxt, selectedTrainer === t.id && s.chipTxtActive]}>{t.full_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={s.label}>Max Capacity</Text>
          <TextInput style={s.input} placeholder="30" placeholderTextColor={C.tMuted} value={maxCapacity} onChangeText={setMaxCapacity} keyboardType="numeric" />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <TouchableOpacity style={[s.toggleBtn, preTest && s.toggleBtnActive]} onPress={() => setPreTest(!preTest)}>
              <Text style={[s.toggleTxt, preTest && s.toggleTxtActive]}>Pre-Test {preTest ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.toggleBtn, postTest && s.toggleBtnActive]} onPress={() => setPostTest(!postTest)}>
              <Text style={[s.toggleTxt, postTest && s.toggleTxtActive]}>Post-Test {postTest ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.saveBtn} onPress={handleCreate} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <><MaterialIcons name="publish" size={20} color="#fff" /><Text style={s.saveBtnTxt}>Create & Publish</Text></>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Handover Modal */}
      <Modal visible={!!handoverSession} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '60%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.t1 }}>Handover Session</Text>
              <TouchableOpacity onPress={() => setHandoverSession(null)}>
                <MaterialIcons name="close" size={24} color={C.tMuted} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 14, color: C.tMuted, marginBottom: 16 }}>
              Reassign "{handoverSession?.title}" to another trainer:
            </Text>
            <ScrollView style={{ maxHeight: 250 }}>
              {trainers.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    padding: 14, borderRadius: 12, marginBottom: 8,
                    backgroundColor: handoverTrainer === t.id ? C.primary + '15' : C.card,
                    borderWidth: 2, borderColor: handoverTrainer === t.id ? C.primary : C.border,
                  }}
                  onPress={() => setHandoverTrainer(t.id)}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: C.primary }}>{(t.full_name || 'T').charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: C.t1 }}>{t.full_name}</Text>
                    <Text style={{ fontSize: 12, color: C.tMuted }}>{t.employee_id}</Text>
                  </View>
                  {handoverTrainer === t.id && <MaterialIcons name="check-circle" size={22} color={C.primary} />}
                  {handoverSession?.trainer_id === t.id && (
                    <View style={{ backgroundColor: '#f59e0b22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#f59e0b' }}>CURRENT</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, marginTop: 16, opacity: handoverTrainer ? 1 : 0.5 }}
              onPress={handleHandover}
              disabled={!handoverTrainer || handoverLoading}
            >
              {handoverLoading ? <ActivityIndicator color="#fff" /> : (
                <><MaterialIcons name="swap-horiz" size={20} color="#fff" /><Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Confirm Handover</Text></>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getColor(status: string) {
  switch(status) { case 'PUBLISHED': return '#3b82f6'; case 'COMPLETED': return '#10b981'; case 'ONGOING': return '#f59e0b'; case 'CANCELLED': return '#ef4444'; default: return '#94a3b8'; }
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 8 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  tabBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabTxt: { fontSize: 13, fontWeight: '700', color: C.tMuted },
  tabTxtActive: { color: '#fff' },
  sessionCard: { backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, gap: 6 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  statusTxt: { fontSize: 10, fontWeight: '700' },
  dateTxt: { fontSize: 12, color: C.tMuted },
  sessTitle: { fontSize: 16, fontWeight: '700', color: C.t1 },
  sessMeta: { fontSize: 12, color: C.tMuted },
  emptyTxt: { textAlign: 'center', color: C.tMuted, fontSize: 14, marginTop: 40 },
  formTitle: { fontSize: 20, fontWeight: '800', color: C.t1 },
  label: { fontSize: 13, fontWeight: '600', color: C.tMuted, marginTop: 4 },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.t1 },
  pickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14 },
  pickerTxt: { fontSize: 15, color: C.t1 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipTxt: { fontSize: 13, fontWeight: '600', color: C.tMuted },
  chipTxtActive: { color: '#fff' },
  toggleBtn: { flex: 1, marginHorizontal: 4, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  toggleBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  toggleTxt: { fontSize: 13, fontWeight: '700', color: C.tMuted },
  toggleTxtActive: { color: '#fff' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
