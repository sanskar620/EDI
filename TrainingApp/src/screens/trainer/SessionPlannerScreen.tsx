import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useSessionsStore } from '../../stores/sessionsStore';
import { UserRole, TABLES } from '../../config/supabase';
import assessmentsService from '../../services/assessmentsService';

export default function SessionPlannerScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user } = useAuthStore();
  const { createSession, publishSession, isLoading } = useSessionsStore();

  // Runtime role check for security
  useEffect(() => {
    if (user?.role !== UserRole.TRAINER && (user?.role as any) !== 'TRAINER') {
      Alert.alert(
        'Access Denied',
        'Only trainers can create training sessions',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [user?.role]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    topic: '',
    module_code: '',
    scheduled_date: '',
    start_time: '',
    end_time: '',
    duration_minutes: '',
    venue_name: '',
    max_capacity: '',
    pre_test_enabled: true,
    post_test_enabled: true,
    passing_threshold: '70',
  });

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [dateObj, setDateObj] = useState(new Date());
  const [startTimeObj, setStartTimeObj] = useState(new Date());
  const [endTimeObj, setEndTimeObj] = useState(new Date());

  // Quiz Builder State
  const [preQuestions, setPreQuestions] = useState<any[]>([]);
  const [postQuestions, setPostQuestions] = useState<any[]>([]);
  const [editingQuizType, setEditingQuizType] = useState<'pre' | 'post' | null>(null);
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate && event.type !== 'dismissed') {
      setDateObj(selectedDate);
      const dateStr = selectedDate.toISOString().split('T')[0];
      updateField('scheduled_date', dateStr);
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  const onStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(Platform.OS === 'ios');
    if (selectedTime && event.type !== 'dismissed') {
      setStartTimeObj(selectedTime);
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      updateField('start_time', `${hours}:${minutes}`);
    } else if (event.type === 'dismissed') {
      setShowStartTimePicker(false);
    }
  };

  const onEndTimeChange = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(Platform.OS === 'ios');
    if (selectedTime && event.type !== 'dismissed') {
      setEndTimeObj(selectedTime);
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      updateField('end_time', `${hours}:${minutes}`);
    } else if (event.type === 'dismissed') {
      setShowEndTimePicker(false);
    }
  };

  const validateForm = (): string | null => {
    if (!form.title.trim()) return 'Title is required';
    if (!form.topic.trim()) return 'Topic is required';
    if (!form.scheduled_date.trim()) return 'Scheduled date is required (YYYY-MM-DD)';
    if (!form.start_time.trim()) return 'Start time is required (HH:MM)';
    if (!form.end_time.trim()) return 'End time is required (HH:MM)';
    if (!form.venue_name.trim()) return 'Venue is required';
    if (!form.max_capacity || parseInt(form.max_capacity) <= 0) return 'Max capacity must be positive';
    return null;
  };

  const handleCreate = async (publish = false) => {
    const error = validateForm();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    const scheduledDate = new Date(form.scheduled_date);
    const [startH, startM] = form.start_time.split(':').map(Number);
    const [endH, endM] = form.end_time.split(':').map(Number);

    const startTime = new Date(scheduledDate);
    startTime.setHours(startH, startM);
    const endTime = new Date(scheduledDate);
    endTime.setHours(endH, endM);

    const sessionData = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      topic: form.topic.trim(),
      module_code: form.module_code.trim() || undefined,
      scheduled_date: scheduledDate.toISOString(),
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: parseInt(form.duration_minutes) || Math.round((endTime.getTime() - startTime.getTime()) / 60000),
      venue_name: form.venue_name.trim(),
      trainer_id: user?.id,
      max_capacity: parseInt(form.max_capacity),
      pre_test_enabled: form.pre_test_enabled,
      post_test_enabled: form.post_test_enabled,
      passing_threshold: parseFloat(form.passing_threshold) || 70,
    };

    const success = await createSession(sessionData);
    if (success) {
      // Save quiz questions to question_bank
      const { sessions } = useSessionsStore.getState();
      const newSession = sessions[0];
      if (newSession?.id) {
        // Save pre-test questions
        if (preQuestions.length > 0) {
          for (const q of preQuestions) {
            await assessmentsService.createQuestion({
              session_id: newSession.id,
              question_text: q.question,
              options: q.options,
              correct_answer: q.options[q.correct],
              difficulty: 2,
              points: 1
            } as any);
          }
        }
        // Save post-test questions
        if (postQuestions.length > 0) {
          for (const q of postQuestions) {
            await assessmentsService.createQuestion({
              session_id: newSession.id,
              question_text: q.question,
              options: q.options,
              correct_answer: q.options[q.correct],
              difficulty: 2,
              points: 1
            } as any);
          }
        }

        if (publish) {
          await publishSession(newSession.id);
        }
      }
      Alert.alert(
        'Success',
        publish ? 'Session created and published! Trainees can now see and enroll.' : 'Session saved as draft.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      Alert.alert('Error', 'Failed to create session. Please try again.');
    }
  };

  const handleCreateAndPublish = () => handleCreate(true);
  const handleSaveDraft = () => handleCreate(false);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Create Training Session</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.form}>
          <Text style={s.label}>Session Title *</Text>
          <TextInput style={s.input} placeholder="e.g. Fire Safety Training" placeholderTextColor={C.tMuted} value={form.title} onChangeText={(v) => updateField('title', v)} />

          <Text style={s.label}>Description</Text>
          <TextInput style={[s.input, s.textArea]} placeholder="Session description..." placeholderTextColor={C.tMuted} multiline numberOfLines={3} value={form.description} onChangeText={(v) => updateField('description', v)} />

          <Text style={s.label}>Topic *</Text>
          <TextInput style={s.input} placeholder="e.g. Fire Safety" placeholderTextColor={C.tMuted} value={form.topic} onChangeText={(v) => updateField('topic', v)} />

          <Text style={s.label}>Module Code</Text>
          <TextInput style={s.input} placeholder="e.g. FS101" placeholderTextColor={C.tMuted} value={form.module_code} onChangeText={(v) => updateField('module_code', v)} />

          <View style={s.row}>
            <View style={s.halfField}>
              <Text style={s.label}>Date *</Text>
              <TouchableOpacity style={s.pickerBtn} onPress={() => setShowDatePicker(true)}>
                <Text style={[s.pickerTxt, !form.scheduled_date && s.placeholderTxt]}>
                  {form.scheduled_date || 'Select Date'}
                </Text>
                <MaterialIcons name="calendar-today" size={18} color={C.tMuted} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dateObj}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>
            <View style={s.halfField}>
              <Text style={s.label}>Duration (min)</Text>
              <TextInput style={s.input} placeholder="e.g. 60" placeholderTextColor={C.tMuted} keyboardType="numeric" value={form.duration_minutes} onChangeText={(v) => updateField('duration_minutes', v)} />
            </View>
          </View>

          <View style={s.row}>
            <View style={s.halfField}>
              <Text style={s.label}>Start Time *</Text>
              <TouchableOpacity style={s.pickerBtn} onPress={() => setShowStartTimePicker(true)}>
                <Text style={[s.pickerTxt, !form.start_time && s.placeholderTxt]}>
                  {form.start_time || 'Select Time'}
                </Text>
                <MaterialIcons name="access-time" size={18} color={C.tMuted} />
              </TouchableOpacity>
              {showStartTimePicker && (
                <DateTimePicker
                  value={startTimeObj}
                  mode="time"
                  display="default"
                  onChange={onStartTimeChange}
                />
              )}
            </View>
            <View style={s.halfField}>
              <Text style={s.label}>End Time *</Text>
              <TouchableOpacity style={s.pickerBtn} onPress={() => setShowEndTimePicker(true)}>
                <Text style={[s.pickerTxt, !form.end_time && s.placeholderTxt]}>
                  {form.end_time || 'Select Time'}
                </Text>
                <MaterialIcons name="access-time" size={18} color={C.tMuted} />
              </TouchableOpacity>
              {showEndTimePicker && (
                <DateTimePicker
                  value={endTimeObj}
                  mode="time"
                  display="default"
                  onChange={onEndTimeChange}
                />
              )}
            </View>
          </View>

          <Text style={s.label}>Venue *</Text>
          <TextInput style={s.input} placeholder="e.g. Training Hall A" placeholderTextColor={C.tMuted} value={form.venue_name} onChangeText={(v) => updateField('venue_name', v)} />

          <Text style={s.label}>Max Capacity *</Text>
          <TextInput style={s.input} placeholder="30" placeholderTextColor={C.tMuted} keyboardType="numeric" value={form.max_capacity} onChangeText={(v) => updateField('max_capacity', v)} />

          <Text style={s.label}>Passing Threshold (%)</Text>
          <TextInput style={s.input} placeholder="70" placeholderTextColor={C.tMuted} keyboardType="numeric" value={form.passing_threshold} onChangeText={(v) => updateField('passing_threshold', v)} />

          {/* Assessment options */}
          <Text style={[s.label, { fontSize: 16, fontWeight: '700', color: C.t1, marginTop: 20 }]}>Assessments</Text>
          <View style={s.toggleRow}>
            <Text style={s.toggleLabel}>Pre-Test</Text>
            <TouchableOpacity style={[s.toggle, form.pre_test_enabled && s.toggleActive]} onPress={() => updateField('pre_test_enabled', !form.pre_test_enabled)}>
              <Text style={[s.toggleText, form.pre_test_enabled && s.toggleTextActive]}>{form.pre_test_enabled ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.toggleRow}>
            <Text style={s.toggleLabel}>Post-Test</Text>
            <TouchableOpacity style={[s.toggle, form.post_test_enabled && s.toggleActive]} onPress={() => updateField('post_test_enabled', !form.post_test_enabled)}>
              <Text style={[s.toggleText, form.post_test_enabled && s.toggleTextActive]}>{form.post_test_enabled ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>

          {/* Quiz Question Builder */}
          {(form.pre_test_enabled || form.post_test_enabled) && (
            <View style={{ marginTop: 12, gap: 10 }}>
              {form.pre_test_enabled && (
                <TouchableOpacity
                  style={[s.toggle, editingQuizType === 'pre' && s.toggleActive, { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 }]}
                  onPress={() => setEditingQuizType(editingQuizType === 'pre' ? null : 'pre')}
                >
                  <MaterialIcons name="quiz" size={18} color={editingQuizType === 'pre' ? C.white : C.tMuted} />
                  <Text style={[s.toggleText, editingQuizType === 'pre' && s.toggleTextActive]}>
                    Pre-Test Questions ({preQuestions.length})
                  </Text>
                </TouchableOpacity>
              )}
              {form.post_test_enabled && (
                <TouchableOpacity
                  style={[s.toggle, editingQuizType === 'post' && s.toggleActive, { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 }]}
                  onPress={() => setEditingQuizType(editingQuizType === 'post' ? null : 'post')}
                >
                  <MaterialIcons name="quiz" size={18} color={editingQuizType === 'post' ? C.white : C.tMuted} />
                  <Text style={[s.toggleText, editingQuizType === 'post' && s.toggleTextActive]}>
                    Post-Test Questions ({postQuestions.length})
                  </Text>
                </TouchableOpacity>
              )}

              {editingQuizType && (
                <View style={{ backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, gap: 10, marginTop: 4 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: C.t1 }}>
                    {editingQuizType === 'pre' ? 'Pre-Test' : 'Post-Test'} Questions
                  </Text>

                  {/* Show existing questions */}
                  {(editingQuizType === 'pre' ? preQuestions : postQuestions).map((q: any, i: number) => (
                    <View key={i} style={{ backgroundColor: C.bg, borderRadius: 8, padding: 10, gap: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: C.t1 }}>Q{i+1}: {q.question}</Text>
                      <Text style={{ fontSize: 11, color: '#10b981' }}>✓ {q.options[q.correct]}</Text>
                    </View>
                  ))}

                  {/* Add new question */}
                  <TextInput
                    style={s.input}
                    placeholder="Question text"
                    placeholderTextColor={C.tMuted}
                    value={qText}
                    onChangeText={setQText}
                  />
                  {qOptions.map((opt, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => setQCorrect(i)}
                        style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: qCorrect === i ? C.primary : C.border, alignItems: 'center', justifyContent: 'center' }}
                      >
                        {qCorrect === i && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.primary }} />}
                      </TouchableOpacity>
                      <TextInput
                        style={[s.input, { flex: 1 }]}
                        placeholder={`Option ${i + 1}`}
                        placeholderTextColor={C.tMuted}
                        value={opt}
                        onChangeText={v => { const next = [...qOptions]; next[i] = v; setQOptions(next); }}
                      />
                    </View>
                  ))}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.primary + '18', borderRadius: 10, paddingVertical: 10 }}
                    onPress={() => {
                      if (!qText.trim() || qOptions.some(o => !o.trim())) {
                        Alert.alert('Error', 'Fill question and all 4 options');
                        return;
                      }
                      const newQ = { question: qText.trim(), options: qOptions.map(o => o.trim()), correct: qCorrect };
                      if (editingQuizType === 'pre') setPreQuestions([...preQuestions, newQ]);
                      else setPostQuestions([...postQuestions, newQ]);
                      setQText(''); setQOptions(['', '', '', '']); setQCorrect(0);
                    }}
                  >
                    <MaterialIcons name="add" size={18} color={C.primary} />
                    <Text style={{ color: C.primary, fontWeight: '700', fontSize: 14 }}>Add Question</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Primary: Create & Publish */}
          <TouchableOpacity style={s.createBtn} onPress={handleCreateAndPublish} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <MaterialIcons name="publish" size={20} color={C.white} />
                <Text style={s.createBtnTxt}>Create & Publish</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Secondary: Save as Draft */}
          <TouchableOpacity style={s.draftBtn} onPress={handleSaveDraft} disabled={isLoading}>
            <MaterialIcons name="save" size={20} color={C.primary} />
            <Text style={s.draftBtnTxt}>Save as Draft</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  form: { padding: 16, gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: C.tMuted, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.t1 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14 },
  pickerTxt: { fontSize: 15, color: C.t1 },
  placeholderTxt: { color: C.tMuted },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  toggleLabel: { fontSize: 15, color: C.t1, fontWeight: '600' },
  toggle: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 16, paddingVertical: 6 },
  toggleActive: { backgroundColor: C.primary, borderColor: C.primary },
  toggleText: { color: C.tMuted, fontWeight: '700', fontSize: 12 },
  toggleTextActive: { color: C.white },
  createBtn: { flexDirection: 'row', backgroundColor: C.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 },
  createBtnTxt: { color: C.white, fontSize: 16, fontWeight: '700' },
  draftBtn: { flexDirection: 'row', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, borderWidth: 1.5, borderColor: C.primary, backgroundColor: C.card },
  draftBtnTxt: { color: C.primary, fontSize: 15, fontWeight: '700' },
});
