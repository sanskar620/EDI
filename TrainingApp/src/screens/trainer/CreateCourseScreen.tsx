import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useCourseStore } from '../../stores/courseStore';
import materialsService from '../../services/materialsService';

type Step = 'details' | 'materials' | 'trainees';

export default function CreateCourseScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user } = useAuthStore();
  const { createCourse, addMaterial, enrollTrainees, publishCourse, fetchAllTrainees, trainees, isLoading } = useCourseStore();

  const [step, setStep] = useState<Step>('details');
  const [courseId, setCourseId] = useState<number | null>(null);

  // Step 1: Details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');

  // Step 2: Materials
  const [materials, setMaterials] = useState<any[]>([]);
  const [matTitle, setMatTitle] = useState('');
  const [matType, setMatType] = useState<string>('VIDEO');
  const [matUrl, setMatUrl] = useState('');
  const [matDesc, setMatDesc] = useState('');
  const [pickedFileName, setPickedFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Step 2b: Quiz Builder (inline)
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);

  // Step 3: Trainee selection
  const [selectedTrainees, setSelectedTrainees] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchAllTrainees();
  }, []);

  const handleCreateCourse = async () => {
    if (!title.trim() || !topic.trim()) {
      Alert.alert('Error', 'Title and Topic are required');
      return;
    }
    const result = await createCourse({
      title: title.trim(),
      description: description.trim(),
      topic: topic.trim(),
      trainer_id: user!.id,
      status: 'DRAFT',
    });
    if (result.success && result.data) {
      setCourseId(result.data.id);
      setStep('materials');
    } else {
      Alert.alert('Error', result.error || 'Failed to create course');
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: matType === 'VIDEO' ? 'video/*' : matType === 'PDF' ? 'application/pdf' : '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const file = result.assets[0];
      if (!file) return;

      setIsUploading(true);
      setPickedFileName(file.name || 'file');

      // Generate upload path
      const fileExt = file.name?.split('.').pop() || 'bin';
      const fileName = `course_${courseId}_${Date.now()}.${fileExt}`;
      const filePath = `course-materials/${fileName}`;

      try {
        const uploadResult = await materialsService.uploadMaterial(file, {
          title: file.name || 'Course Material',
          topic: topic || 'General',
          material_type: matType as any
        });

        if (uploadResult.success && uploadResult.data) {
           const downloadUrlRes = await materialsService.getDownloadUrl(uploadResult.data.s3_key);
           if (downloadUrlRes.success) {
             setMatUrl(downloadUrlRes.data.url);
           } else {
             setMatUrl(uploadResult.data.s3_key);
           }
        } else {
           console.warn('Backend upload failed, using direct URI:', uploadResult.error);
           setMatUrl(file.uri);
        }
      } catch (uploadErr: any) {
        console.warn('Upload error, using file URI:', uploadErr.message);
        setMatUrl(file.uri);
      }

      setIsUploading(false);
      Alert.alert('✅ File Selected', file.name || 'File ready');
    } catch (err: any) {
      setIsUploading(false);
      Alert.alert('Error', err.message || 'Failed to pick file');
    }
  };

  const handleAddMaterial = async () => {
    if (!courseId || !matTitle.trim()) {
      Alert.alert('Error', 'Material title is required');
      return;
    }
    if (matType !== 'QUIZ' && !matUrl.trim()) {
      Alert.alert('Error', 'Please upload a file or enter a URL');
      return;
    }

    const materialData: any = {
      course_id: courseId,
      title: matTitle.trim(),
      material_type: matType,
      description: matDesc.trim() || undefined,
    };

    if (matType === 'QUIZ') {
      if (quizQuestions.length === 0) {
        Alert.alert('Error', 'Add at least one question for the quiz');
        return;
      }
      materialData.quiz_data = { questions: quizQuestions };
    } else {
      materialData.content_url = matUrl.trim();
    }

    const result = await addMaterial(materialData);
    if (result.success) {
      setMaterials([...materials, { ...materialData, id: result.data?.id }]);
      setMatTitle('');
      setMatUrl('');
      setMatDesc('');
      setPickedFileName('');
      setQuizQuestions([]);
      Alert.alert('✅ Added', `${matTitle} has been added to the course`);
    } else {
      Alert.alert('Error', result.error || 'Failed to add material');
    }
  };

  const handleAddQuestion = () => {
    if (!qText.trim()) return;
    if (qOptions.some(o => !o.trim())) {
      Alert.alert('Error', 'All 4 options are required');
      return;
    }
    setQuizQuestions([...quizQuestions, {
      id: quizQuestions.length + 1,
      question: qText.trim(),
      options: qOptions.map(o => o.trim()),
      correct: qCorrect,
    }]);
    setQText('');
    setQOptions(['', '', '', '']);
    setQCorrect(0);
  };

  const handlePublish = async () => {
    if (!courseId) return;

    // Enroll selected trainees
    if (selectedTrainees.size > 0) {
      await enrollTrainees(courseId, Array.from(selectedTrainees));
    }

    // Publish
    const success = await publishCourse(courseId);
    if (success) {
      Alert.alert('🎉 Course Published!', `${title} is now live for ${selectedTrainees.size} trainees.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Error', 'Failed to publish course');
    }
  };

  const toggleTrainee = (id: number) => {
    const next = new Set(selectedTrainees);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedTrainees(next);
  };

  const selectAllTrainees = () => {
    if (selectedTrainees.size === trainees.length) {
      setSelectedTrainees(new Set());
    } else {
      setSelectedTrainees(new Set(trainees.map((t: any) => t.id)));
    }
  };

  const topics = ['Compliance', 'Technology', 'Safety', 'Leadership', 'HR', 'Operations', 'General'];
  const matTypes = [
    { key: 'VIDEO', icon: 'play-circle-outline', label: 'Video' },
    { key: 'PDF', icon: 'picture-as-pdf', label: 'PDF' },
    { key: 'DOCUMENT', icon: 'description', label: 'Document' },
    { key: 'QUIZ', icon: 'quiz', label: 'Quiz' },
  ];

  // ── STEP INDICATOR ──
  const renderStepIndicator = () => (
    <View style={s.stepRow}>
      {['details', 'materials', 'trainees'].map((st, i) => (
        <View key={st} style={s.stepItem}>
          <View style={[s.stepCircle, step === st && s.stepCircleActive, (['materials', 'trainees'].indexOf(step) > i - 1 && step !== st) && s.stepCircleDone]}>
            <Text style={[s.stepNum, (step === st) && s.stepNumActive]}>
              {i + 1}
            </Text>
          </View>
          <Text style={[s.stepLabel, step === st && s.stepLabelActive]}>
            {st === 'details' ? 'Details' : st === 'materials' ? 'Materials' : 'Trainees'}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Create Course</Text>
        <View style={{ width: 24 }} />
      </View>

      {renderStepIndicator()}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ══════ STEP 1: DETAILS ══════ */}
        {step === 'details' && (
          <View style={s.form}>
            <Text style={s.stepTitle}>📚 Course Information</Text>

            <Text style={s.label}>Course Title *</Text>
            <TextInput style={s.input} placeholder="e.g. AL&M Compliance Training" placeholderTextColor={C.tMuted} value={title} onChangeText={setTitle} />

            <Text style={s.label}>Description</Text>
            <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} placeholder="What will trainees learn?" placeholderTextColor={C.tMuted} value={description} onChangeText={setDescription} multiline />

            <Text style={s.label}>Topic / Category *</Text>
            <View style={s.chipRow}>
              {topics.map(t => (
                <TouchableOpacity key={t} style={[s.chip, topic === t && s.chipActive]} onPress={() => setTopic(t)}>
                  <Text style={[s.chipTxt, topic === t && s.chipTxtActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={s.primaryBtn} onPress={handleCreateCourse} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                  <Text style={s.primaryBtnTxt}>Next: Add Materials</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ══════ STEP 2: MATERIALS ══════ */}
        {step === 'materials' && (
          <View style={s.form}>
            <Text style={s.stepTitle}>📎 Add Course Materials</Text>

            {/* Added materials list */}
            {materials.length > 0 && (
              <View style={s.addedList}>
                {materials.map((m, i) => (
                  <View key={i} style={s.addedItem}>
                    <MaterialIcons name={matTypes.find(t => t.key === m.material_type)?.icon as any || 'insert-drive-file'} size={20} color={C.primary} />
                    <Text style={s.addedItemTxt} numberOfLines={1}>{m.title}</Text>
                    <View style={[s.typeBadge, { backgroundColor: getTypeColor(m.material_type) + '22' }]}>
                      <Text style={[s.typeBadgeTxt, { color: getTypeColor(m.material_type) }]}>{m.material_type}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Material type selector */}
            <Text style={s.label}>Material Type</Text>
            <View style={s.chipRow}>
              {matTypes.map(t => (
                <TouchableOpacity key={t.key} style={[s.chip, matType === t.key && s.chipActive]} onPress={() => setMatType(t.key)}>
                  <MaterialIcons name={t.icon as any} size={16} color={matType === t.key ? '#fff' : C.tMuted} />
                  <Text style={[s.chipTxt, matType === t.key && s.chipTxtActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Title *</Text>
            <TextInput style={s.input} placeholder="e.g. Introduction Video" placeholderTextColor={C.tMuted} value={matTitle} onChangeText={setMatTitle} />

            {matType !== 'QUIZ' && (
              <>
                <Text style={s.label}>Upload File *</Text>
                <TouchableOpacity style={s.uploadBtn} onPress={handlePickFile} disabled={isUploading}>
                  {isUploading ? (
                    <><ActivityIndicator size="small" color={C.primary} /><Text style={s.uploadBtnTxt}>Uploading...</Text></>
                  ) : pickedFileName ? (
                    <><MaterialIcons name="check-circle" size={20} color="#10b981" /><Text style={[s.uploadBtnTxt, { color: '#10b981' }]} numberOfLines={1}>{pickedFileName}</Text></>
                  ) : (
                    <><MaterialIcons name="cloud-upload" size={22} color={C.primary} /><Text style={s.uploadBtnTxt}>Pick {matType === 'VIDEO' ? 'Video' : matType === 'PDF' ? 'PDF' : 'File'} from Device</Text></>
                  )}
                </TouchableOpacity>
                <Text style={s.label}>Or paste URL</Text>
                <TextInput style={s.input} placeholder="https://..." placeholderTextColor={C.tMuted} value={matUrl} onChangeText={setMatUrl} autoCapitalize="none" />
              </>
            )}

            <Text style={s.label}>Description</Text>
            <TextInput style={s.input} placeholder="Brief description" placeholderTextColor={C.tMuted} value={matDesc} onChangeText={setMatDesc} />

            {/* QUIZ BUILDER */}
            {matType === 'QUIZ' && (
              <View style={s.quizBuilder}>
                <Text style={s.quizTitle}>Quiz Questions ({quizQuestions.length} added)</Text>

                {/* Question input */}
                <TextInput style={s.input} placeholder="Question text" placeholderTextColor={C.tMuted} value={qText} onChangeText={setQText} />

                {qOptions.map((opt, i) => (
                  <View key={i} style={s.optionRow}>
                    <TouchableOpacity onPress={() => setQCorrect(i)} style={[s.radioBtn, qCorrect === i && s.radioBtnActive]}>
                      {qCorrect === i && <View style={s.radioDot} />}
                    </TouchableOpacity>
                    <TextInput
                      style={[s.input, { flex: 1 }]}
                      placeholder={`Option ${i + 1}`}
                      placeholderTextColor={C.tMuted}
                      value={opt}
                      onChangeText={v => {
                        const next = [...qOptions];
                        next[i] = v;
                        setQOptions(next);
                      }}
                    />
                  </View>
                ))}

                <TouchableOpacity style={s.secondaryBtn} onPress={handleAddQuestion}>
                  <MaterialIcons name="add" size={18} color={C.primary} />
                  <Text style={s.secondaryBtnTxt}>Add Question</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={s.secondaryBtn} onPress={handleAddMaterial} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color={C.primary} /> : (
                <>
                  <MaterialIcons name="add-circle" size={18} color={C.primary} />
                  <Text style={s.secondaryBtnTxt}>Add Material to Course</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={s.primaryBtn} onPress={() => setStep('trainees')}>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              <Text style={s.primaryBtnTxt}>Next: Select Trainees</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ══════ STEP 3: TRAINEES ══════ */}
        {step === 'trainees' && (
          <View style={s.form}>
            <Text style={s.stepTitle}>👥 Enroll Trainees</Text>

            <TouchableOpacity style={s.selectAllBtn} onPress={selectAllTrainees}>
              <MaterialIcons
                name={selectedTrainees.size === trainees.length ? 'check-box' : 'check-box-outline-blank'}
                size={22}
                color={C.primary}
              />
              <Text style={s.selectAllTxt}>
                {selectedTrainees.size === trainees.length ? 'Deselect All' : 'Select All'} ({selectedTrainees.size}/{trainees.length})
              </Text>
            </TouchableOpacity>

            {trainees.map((t: any) => (
              <TouchableOpacity key={t.id} style={s.traineeCard} onPress={() => toggleTrainee(t.id)}>
                <MaterialIcons
                  name={selectedTrainees.has(t.id) ? 'check-box' : 'check-box-outline-blank'}
                  size={22}
                  color={selectedTrainees.has(t.id) ? C.primary : C.tMuted}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.traineeName}>{t.full_name}</Text>
                  <Text style={s.traineeInfo}>{t.employee_id} • {t.department || 'N/A'}</Text>
                </View>
              </TouchableOpacity>
            ))}

            <View style={s.publishRow}>
              <TouchableOpacity style={[s.primaryBtn, { flex: 1 }]} onPress={handlePublish} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <MaterialIcons name="publish" size={20} color="#fff" />
                    <Text style={s.primaryBtnTxt}>Publish Course</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'VIDEO': return '#3b82f6';
    case 'PDF': return '#ef4444';
    case 'QUIZ': return '#f59e0b';
    case 'DOCUMENT': return '#10b981';
    default: return '#6b7280';
  }
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  stepRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.card, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: C.primary, borderColor: C.primary },
  stepCircleDone: { backgroundColor: '#10b981', borderColor: '#10b981' },
  stepNum: { fontSize: 14, fontWeight: '700', color: C.tMuted },
  stepNumActive: { color: '#fff' },
  stepLabel: { fontSize: 11, fontWeight: '600', color: C.tMuted },
  stepLabelActive: { color: C.primary },
  form: { padding: 16, gap: 12 },
  stepTitle: { fontSize: 20, fontWeight: '800', color: C.t1, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: C.tMuted, marginTop: 4 },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.t1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipTxt: { fontSize: 13, fontWeight: '600', color: C.tMuted },
  chipTxtActive: { color: '#fff' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  primaryBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.card, borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: C.primary, marginTop: 8 },
  secondaryBtnTxt: { color: C.primary, fontSize: 14, fontWeight: '700' },
  addedList: { gap: 8, marginBottom: 8 },
  addedItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.border },
  addedItemTxt: { flex: 1, fontSize: 14, fontWeight: '600', color: C.t1 },
  typeBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  typeBadgeTxt: { fontSize: 10, fontWeight: '700' },
  quizBuilder: { backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, gap: 10, marginTop: 8 },
  quizTitle: { fontSize: 15, fontWeight: '700', color: C.t1 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radioBtn: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  radioBtnActive: { borderColor: C.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.primary },
  selectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 8 },
  selectAllTxt: { fontSize: 15, fontWeight: '700', color: C.primary },
  traineeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.border },
  traineeName: { fontSize: 15, fontWeight: '700', color: C.t1 },
  traineeInfo: { fontSize: 12, color: C.tMuted, marginTop: 2 },
  publishRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.card, borderWidth: 2, borderColor: C.primary + '44', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 20, marginTop: 4 },
  uploadBtnTxt: { fontSize: 14, fontWeight: '600', color: C.primary },
});
