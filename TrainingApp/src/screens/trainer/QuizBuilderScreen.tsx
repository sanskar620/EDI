import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAssessmentStore } from '../../stores/assessmentStore';

export default function QuizBuilderScreen({ navigation, route }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { createQuestion, isLoading } = useAssessmentStore();
  const topic = route?.params?.topic || '';

  const [form, setForm] = useState({
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: '',
    topic: topic,
    difficulty: 'MEDIUM',
    marks: '1',
  });

  const updateOption = (index: number, value: string) => {
    const newOptions = [...form.options];
    newOptions[index] = value;
    setForm((prev) => ({ ...prev, options: newOptions }));
  };

  const validateForm = (): string | null => {
    if (!form.question_text.trim()) return 'Question text is required';
    if (!form.topic.trim()) return 'Topic is required';
    const filledOptions = form.options.filter((o) => o.trim());
    if (filledOptions.length < 2) return 'At least 2 options are required';
    if (!form.correct_answer.trim()) return 'Correct answer is required';
    if (!form.options.includes(form.correct_answer)) return 'Correct answer must match one of the options';
    return null;
  };

  const handleCreate = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    const questionData = {
      question_text: form.question_text.trim(),
      options: form.options.filter((o) => o.trim()),
      correct_answer: form.correct_answer.trim(),
      topic: form.topic.trim(),
      difficulty: form.difficulty,
      marks: parseInt(form.marks) || 1,
      is_active: true,
    };

    const success = await createQuestion(questionData);
    if (success) {
      Alert.alert('Success', 'Question created!', [
        { text: 'Add Another', onPress: () => setForm({ ...form, question_text: '', options: ['', '', '', ''], correct_answer: '' }) },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Error', 'Failed to create question');
    }
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Quiz Builder</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.form}>
          <Text style={s.label}>Topic *</Text>
          <TextInput style={s.input} placeholder="e.g. Fire Safety" placeholderTextColor={C.tMuted} value={form.topic} onChangeText={(v) => setForm((p) => ({ ...p, topic: v }))} />

          <Text style={s.label}>Question *</Text>
          <TextInput style={[s.input, s.textArea]} placeholder="Enter your question..." placeholderTextColor={C.tMuted} multiline numberOfLines={3} value={form.question_text} onChangeText={(v) => setForm((p) => ({ ...p, question_text: v }))} />

          <Text style={s.label}>Options</Text>
          {form.options.map((option, index) => (
            <View key={index} style={s.optionRow}>
              <View style={[s.optionIndicator, { backgroundColor: form.correct_answer === option && option ? C.success + '22' : C.card }]}>
                <Text style={[s.optionLetter, { color: form.correct_answer === option && option ? C.success : C.tMuted }]}>
                  {String.fromCharCode(65 + index)}
                </Text>
              </View>
              <TextInput
                style={s.optionInput}
                placeholder={`Option ${String.fromCharCode(65 + index)}`}
                placeholderTextColor={C.tMuted}
                value={option}
                onChangeText={(v) => updateOption(index, v)}
              />
              {option.trim() && (
                <TouchableOpacity onPress={() => setForm((p) => ({ ...p, correct_answer: option }))}>
                  <MaterialIcons
                    name={form.correct_answer === option ? 'check-circle' : 'radio-button-unchecked'}
                    size={24}
                    color={form.correct_answer === option ? C.success : C.tMuted}
                  />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <Text style={s.hint}>Tap the circle to mark the correct answer</Text>

          <View style={s.row}>
            <View style={s.halfField}>
              <Text style={s.label}>Difficulty</Text>
              <View style={s.difficultyRow}>
                {['EASY', 'MEDIUM', 'HARD'].map((d) => (
                  <TouchableOpacity key={d} style={[s.diffBtn, form.difficulty === d && s.diffBtnActive]} onPress={() => setForm((p) => ({ ...p, difficulty: d }))}>
                    <Text style={[s.diffTxt, form.difficulty === d && s.diffTxtActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={s.halfField}>
              <Text style={s.label}>Marks</Text>
              <TextInput style={s.input} placeholder="1" placeholderTextColor={C.tMuted} keyboardType="numeric" value={form.marks} onChangeText={(v) => setForm((p) => ({ ...p, marks: v }))} />
            </View>
          </View>

          <TouchableOpacity style={s.createBtn} onPress={handleCreate} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <MaterialIcons name="add-circle" size={20} color={C.white} />
                <Text style={s.createBtnTxt}>Create Question</Text>
              </>
            )}
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
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  optionIndicator: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  optionLetter: { fontSize: 14, fontWeight: '700' },
  optionInput: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: C.t1 },
  hint: { fontSize: 11, color: C.tMuted, fontStyle: 'italic' },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  difficultyRow: { flexDirection: 'row', gap: 8 },
  diffBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  diffBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  diffTxt: { fontSize: 11, fontWeight: '700', color: C.tMuted },
  diffTxtActive: { color: C.white },
  createBtn: { flexDirection: 'row', backgroundColor: C.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 },
  createBtnTxt: { color: C.white, fontSize: 16, fontWeight: '700' },
});
