import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { FileSystemUploadType } from 'expo-file-system/legacy';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useSessionsStore } from '../../stores/sessionsStore';
import { useEnrollmentStore } from '../../stores/enrollmentStore';
import authService from '../../services/authService';
import sessionsService from '../../services/sessionsService';
import materialsService from '../../services/materialsService';
import attendanceService from '../../services/attendanceService';
import assessmentsService from '../../services/assessmentsService';
import userService from '../../services/userService';

export default function SessionDetailsScreen({ navigation, route }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const sessionId = route?.params?.sessionId;
  const { user } = useAuthStore();
  const { currentSession, fetchSessionById, isLoading } = useSessionsStore();
  const { sessionEnrollments, fetchSessionEnrollments } = useEnrollmentStore();

  const [tab, setTab] = useState<'info' | 'materials' | 'assessments' | 'attendance' | 'feedback'>('info');
  const [feedbackStats, setFeedbackStats] = useState<any>(null);
  const [assessmentTab, setAssessmentTab] = useState<'PRE_TEST'|'POST_TEST'>('PRE_TEST');
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Module form
  const [showAddModule, setShowAddModule] = useState(false);

  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [modTitle, setModTitle] = useState('');

  // Material form
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);

  // Material form
  const [matTitle, setMatTitle] = useState('');
  const [matUrl, setMatUrl] = useState('');
  const [matType, setMatType] = useState<'VIDEO' | 'PDF' | 'DOCUMENT'>('PDF');
  const [matMode, setMatMode] = useState<'file' | 'url'>('file');

  // Quiz form
  const [quizType, setQuizType] = useState<'PRE_TEST' | 'POST_TEST'>('PRE_TEST');
  const [questions, setQuestions] = useState<any[]>([]);
  const [qText, setQText] = useState('');
  const [opts, setOpts] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);

  useEffect(() => {
    if (sessionId) {
      fetchSessionById(sessionId);
      fetchSessionEnrollments(sessionId);
      fetchLiveAttendance();
      fetchModules();
      fetchFeedbackStats();
    }
  }, [sessionId]);

  const fetchFeedbackStats = async () => {
    try {
      const { API_BASE_URL } = require('../../services/api');
      const token = authService.getAuthToken();
      const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/feedback-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFeedbackStats(data);
      }
    } catch (e) {
      console.log('Failed to fetch feedback stats', e);
    }
  };

  // Fetch questions once the session's topic is available
  useEffect(() => {
    if (currentSession?.topic) {
      fetchQuestions(currentSession.topic);
    }
  }, [currentSession?.topic]);

  const fetchLiveAttendance = async () => {
    const res = await attendanceService.getSessionAttendance(sessionId);
    if (res.success && res.data) {
      setAttendanceRecords(res.data);
    }
  };

  const fetchModules = async () => {
    const res = await sessionsService.getSessionModules(sessionId);
    if (res.success && res.data && res.data.length > 0) {
      setModules(res.data);
    } else {
      setModules([]);
    }
  };

  const fetchQuestions = async (topicStr?: string) => {
    const t = topicStr || currentSession?.topic || '';
    const res = await assessmentsService.getQuestions({ topic: t, sessionId });
    if (res.success && res.data) setQuestions(res.data);
  };

  // ─── Upload Material (File) ───
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: matType === 'VIDEO' ? 'video/*' : matType === 'PDF' ? 'application/pdf' : '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if (!file) return;

      
      const sizeMB = file.size ? file.size / (1024 * 1024) : 0;
      if (sizeMB > 150) {
        Alert.alert('File Too Large', `Please select a file smaller than 150MB. This file is ${sizeMB.toFixed(1)}MB.`);
        return;
      }

      setSelectedFile(file);
      setMatTitle(file.name || 'Material');
      setMatUrl(file.uri);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleSaveMaterial = async () => {
    if (!matTitle.trim() || !matUrl.trim() || !selectedModuleId) { Alert.alert('Error', 'Title, file/URL and Module are required'); return; }
    setUploading(true);
    setUploadProgress('Uploading material...');
    const mod = modules.find((m: any) => m.id === selectedModuleId);
    const order_number = mod && mod.materials ? mod.materials.length + 1 : 1;
    
    const fileToUpload = selectedFile || { uri: matUrl, name: matTitle, mimeType: 'application/octet-stream' };
    
    const res = await materialsService.uploadMaterial(
      fileToUpload,
      {
        title: matTitle.trim(),
        material_type: matType as any,
        topic: session?.topic || 'General',
        module_id: selectedModuleId,
        order_number: order_number,
      }
    );
    setUploading(false);
    setUploadProgress('');
    if (!res.success) { Alert.alert('Error', res.error || 'Failed to save material'); return; }
    Alert.alert('Saved', 'Material uploaded successfully!');
    setMatTitle(''); setMatUrl(''); setSelectedFile(null);
    fetchModules();
  };

  const handleSaveModule = async () => {
    if (!modTitle.trim()) { Alert.alert('Error', 'Module title required'); return; }
    setUploading(true);
    const order_number = modules.length + 1;
    const res = await sessionsService.createModule(sessionId, {
      title: modTitle.trim(),
      order_number,
    });
    setUploading(false);
    if (!res.success) { Alert.alert('Error', res.error || 'Failed to create module'); return; }
    setModTitle('');
    setShowAddModule(false);
    fetchModules();
  };

  const handleDeleteMaterial = async (id: number, title: string) => {
    Alert.alert(
      'Delete Material',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const { API_BASE_URL } = require('../../services/api');
            const token = authService.getAuthToken();
            try {
              const res = await fetch(`${API_BASE_URL}/materials/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (res.ok) {
                fetchModules();
              } else {
                Alert.alert('Error', 'Failed to delete material');
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  };


  // ─── Quiz Builder ───
  const handleAddQuestion = async () => {
    if (!qText.trim() || opts.some(o => !o.trim())) { Alert.alert('Error', 'Fill question and all 4 options'); return; }
    const res = await assessmentsService.createQuestion({
      topic: session?.topic || 'General',
      sessionId: sessionId,
      question_text: qText.trim(),
      question_type: 'MCQ',
      options: opts.map(o => o.trim()),
      correct_answer: opts[correct].trim(),
      difficulty: 2,
      points: 1,
      is_active: true,
    } as any);
    if (!res.success) { Alert.alert('Error', res.error || 'Failed to add question'); return; }
    setQText(''); setOpts(['', '', '', '']); setCorrect(0);
    fetchQuestions();
    Alert.alert('✅ Added', 'Question saved');
  };

  const handleDeleteQuestion = async (id: number) => {
    await assessmentsService.deleteQuestion(id);
    fetchQuestions();
  };

  const session = currentSession;
  if (isLoading || !session) {
    return <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.primary} /></View>;
  }

  // Questions are fetched by topic and don't have an intended_for field in the backend
  // We just display the whole bank for this session

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><MaterialIcons name="arrow-back" size={24} color={C.t1} /></TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{session.title}</Text>
        <TouchableOpacity onPress={() => { fetchLiveAttendance(); fetchModules(); fetchQuestions(); }}><MaterialIcons name="refresh" size={24} color={C.primary} /></TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 48, minHeight: 48 }} contentContainerStyle={{ paddingHorizontal: 12, gap: 6, alignItems: 'center' }}>
        {(['info', 'materials', 'attendance', 'assessments', ...(user?.role !== 'TRAINER' ? ['feedback'] : [])] as const).map((t: any) => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>
              {t === 'info' ? '📋 Info' : t === 'materials' ? '📁 Materials' : t === 'assessments' ? '📝 Assessments' : t === 'attendance' ? '✅ Attendance' : '⭐ Feedback'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>

        {/* ═══ INFO TAB ═══ */}
        {tab === 'info' && (<>
          <View style={s.card}>
            <View style={[s.badge, { backgroundColor: getCol(session.status) + '22' }]}><Text style={[s.badgeTxt, { color: getCol(session.status) }]}>{session.status}</Text></View>
            <DRow icon="event" label="Date" val={session.scheduled_date ? new Date(session.scheduled_date).toLocaleDateString() : 'TBD'} C={C} />
            <DRow icon="schedule" label="Time" val={`${fmt(session.start_time)} - ${fmt(session.end_time)}`} C={C} />
            <DRow icon="location-on" label="Venue" val={session.venue_name || 'TBD'} C={C} />
            <DRow icon="groups" label="Enrolled" val={`${session.enrolled_count || sessionEnrollments.length || 0} / ${session.max_capacity || '∞'}`} C={C} />
            <DRow icon="quiz" label="Pre-Test" val={session.pre_test_enabled ? '✅ Enabled' : '❌ Disabled'} C={C} />
            <DRow icon="fact-check" label="Post-Test" val={session.post_test_enabled ? '✅ Enabled' : '❌ Disabled'} C={C} />
          </View>
          <TouchableOpacity style={s.actionBtn} onPress={() => navigation.navigate('LiveAttendance', { sessionId })}>
            <MaterialIcons name="how-to-reg" size={20} color="#fff" /><Text style={s.actionBtnTxt}>Mark Attendance</Text>
          </TouchableOpacity>
        </>)}

        {/* ═══ MATERIALS TAB ═══ */}
        {tab === 'materials' && (<>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={s.secTitle}>Modules & Materials</Text>
            <TouchableOpacity style={{ backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }} onPress={() => setShowAddModule(!showAddModule)}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{showAddModule ? 'Cancel' : '+ Add Module'}</Text>
            </TouchableOpacity>
          </View>

          {showAddModule && (
            <View style={{ backgroundColor: C.card, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 16 }}>
              <TextInput style={s.input} placeholder="Module Title (e.g. Basics)" placeholderTextColor={C.tMuted} value={modTitle} onChangeText={setModTitle} />
              <TouchableOpacity style={s.saveBtn} onPress={handleSaveModule} disabled={uploading}>
                {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnTxt}>Save Module</Text>}
              </TouchableOpacity>
            </View>
          )}

          {modules.map((mod: any, idx: number) => (
            <View key={mod.id} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.card, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: C.t1 }}>Module {idx + 1}: {mod.title}</Text>
                <TouchableOpacity onPress={() => setSelectedModuleId(mod.id)}>
                  <Text style={{ color: C.primary, fontSize: 13, fontWeight: '600' }}>+ Add Material</Text>
                </TouchableOpacity>
              </View>

              {mod.materials?.map((m: any, mIdx: number) => (
                <View key={m.id} style={[s.matCard, { marginLeft: 16 }]}>
                  <Text style={{ color: C.tMuted, fontSize: 13, fontWeight: '700', marginRight: 4 }}>{mIdx + 1}.</Text>
                  <MaterialIcons name={m.material_type === 'VIDEO' ? 'videocam' : 'description'} size={20} color={C.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.matTitle}>{m.title}</Text>
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate(m.material_type === 'VIDEO' ? 'VideoPlayer' : 'DocumentViewer', { material: m })} style={{ padding: 4, marginRight: 8 }}>
                    <MaterialIcons name={m.material_type === 'VIDEO' ? 'play-circle-outline' : 'visibility'} size={22} color={C.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteMaterial(m.id, m.title)} style={{ padding: 4 }}>
                    <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}

              {selectedModuleId === mod.id && (
                <View style={{ backgroundColor: C.bg, padding: 12, marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: C.primary + '66' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: C.t1, marginBottom: 8 }}>Add Material to {mod.title}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                    {(['PDF', 'VIDEO'] as const).map(t => (
                      <TouchableOpacity key={t} style={[s.chip, matType === t && s.chipAct, { paddingVertical: 6, paddingHorizontal: 10 }]} onPress={() => setMatType(t)}>
                        <Text style={[s.chipTxt, { fontSize: 11 }, matType === t && { color: '#fff' }]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                    <TouchableOpacity style={[s.chip, matMode === 'file' && s.chipAct, { paddingVertical: 6, paddingHorizontal: 10 }]} onPress={() => setMatMode('file')}>
                      <Text style={[s.chipTxt, { fontSize: 11 }, matMode === 'file' && { color: '#fff' }]}>📂 Local File</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.chip, matMode === 'url' && s.chipAct, { paddingVertical: 6, paddingHorizontal: 10 }]} onPress={() => setMatMode('url')}>
                      <Text style={[s.chipTxt, { fontSize: 11 }, matMode === 'url' && { color: '#fff' }]}>🔗 URL</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput style={[s.input, { marginTop: 0 }]} placeholder="Material Title" placeholderTextColor={C.tMuted} value={matTitle} onChangeText={setMatTitle} />
                  {matMode === 'file' ? (
                    <View>
                      <TouchableOpacity style={[s.uploadBtn, { paddingVertical: 12, marginTop: 8 }]} onPress={handlePickFile} disabled={uploading}>
                        {uploading ? (
                          <View style={{ alignItems: 'center', gap: 6 }}>
                            <ActivityIndicator color={C.primary} />
                            {uploadProgress ? <Text style={{ color: C.tMuted, fontSize: 12 }}>{uploadProgress}</Text> : null}
                          </View>
                        ) : (
                          <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>{matUrl ? '✅ File Uploaded' : '📂 Pick File from Device'}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TextInput style={[s.input, { marginTop: 8 }]} placeholder="Paste URL here..." placeholderTextColor={C.tMuted} value={matUrl} onChangeText={setMatUrl} autoCapitalize="none" />
                  )}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <TouchableOpacity style={[s.saveBtn, { flex: 1, marginTop: 0 }]} onPress={handleSaveMaterial} disabled={uploading}>
                      {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnTxt}>Upload</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.saveBtn, { backgroundColor: C.border, marginTop: 0, paddingHorizontal: 16 }]} onPress={() => setSelectedModuleId(null)}>
                      <Text style={{ color: C.t1, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}
          {modules.length === 0 && !showAddModule && (
            <Text style={s.emptyTxt}>No modules yet. Click "+ Add Module" to start.</Text>
          )}
        </>)}

        {/* ═══ ASSESSMENTS TAB ═══ */}
        {tab === 'assessments' && (<>
          {!session.pre_test_enabled && !session.post_test_enabled ? (
            <Text style={s.emptyTxt}>Tests are disabled for this session. Supervisor can enable them.</Text>
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {session.pre_test_enabled && (
                  <TouchableOpacity 
                    style={[s.chip, assessmentTab === 'PRE_TEST' && s.chipAct]} 
                    onPress={() => setAssessmentTab('PRE_TEST')}
                  >
                    <Text style={[s.chipTxt, assessmentTab === 'PRE_TEST' && { color: '#fff' }]}>Pre-Test Questions</Text>
                  </TouchableOpacity>
                )}
                {session.post_test_enabled && (
                  <TouchableOpacity 
                    style={[s.chip, assessmentTab === 'POST_TEST' && s.chipAct]} 
                    onPress={() => setAssessmentTab('POST_TEST')}
                  >
                    <Text style={[s.chipTxt, assessmentTab === 'POST_TEST' && { color: '#fff' }]}>Post-Test Questions</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={s.secTitle}>Add Question for {assessmentTab === 'PRE_TEST' ? 'Pre-Test' : 'Post-Test'}</Text>
              <TextInput style={[s.input, { minHeight: 60 }]} placeholder="Question text..." placeholderTextColor={C.tMuted} value={qText} onChangeText={setQText} multiline />
              {opts.map((o, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <TouchableOpacity onPress={() => setCorrect(i)}>
                    <MaterialIcons name={correct === i ? 'radio-button-checked' : 'radio-button-unchecked'} size={22} color={correct === i ? '#10b981' : C.tMuted} />
                  </TouchableOpacity>
                  <TextInput style={[s.input, { flex: 1, marginTop: 0 }]} placeholder={`Option ${String.fromCharCode(65 + i)}`} placeholderTextColor={C.tMuted} value={o} onChangeText={v => { const n = [...opts]; n[i] = v; setOpts(n); }} />
                </View>
              ))}
              <Text style={{ fontSize: 11, color: C.tMuted, marginTop: 4 }}>Select the radio button next to the correct answer</Text>
              <TouchableOpacity style={s.saveBtn} onPress={handleAddQuestion}>
                <MaterialIcons name="add" size={18} color="#fff" /><Text style={s.saveBtnTxt}>Add Question</Text>
              </TouchableOpacity>

              {/* Existing questions (Question Bank) */}
              {questions.length > 0 && <Text style={[s.secTitle, { marginTop: 24 }]}>Question Bank ({questions.length})</Text>}
              {questions.map((q: any, idx: number) => (
                <View key={q.id} style={[s.matCard, { marginTop: 10 }]}>
                  <Text style={{ color: C.t1, fontSize: 14, fontWeight: '600', flex: 1 }}>Q{idx + 1}. {q.question_text}</Text>
                  <TouchableOpacity onPress={() => handleDeleteQuestion(q.id)}><MaterialIcons name="delete" size={20} color="#ef4444" /></TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </>)}

        {/* ═══ ATTENDANCE TAB ═══ */}
        {tab === 'attendance' && (<>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <View style={[s.statBox, { backgroundColor: '#10b98115' }]}><Text style={[s.statVal, { color: '#10b981' }]}>{attendanceRecords.length}</Text><Text style={s.statLbl}>Present</Text></View>
            <View style={[s.statBox, { backgroundColor: '#ef444415' }]}><Text style={[s.statVal, { color: '#ef4444' }]}>{Math.max(0, sessionEnrollments.length - attendanceRecords.length)}</Text><Text style={s.statLbl}>Absent</Text></View>
            <View style={[s.statBox, { backgroundColor: '#3b82f615' }]}><Text style={[s.statVal, { color: '#3b82f6' }]}>{sessionEnrollments.length > 0 ? Math.round((attendanceRecords.length / sessionEnrollments.length) * 100) : 0}%</Text><Text style={s.statLbl}>Rate</Text></View>
          </View>

          <TouchableOpacity style={s.actionBtn} onPress={() => navigation.navigate('LiveAttendance', { sessionId })}>
            <MaterialIcons name="how-to-reg" size={20} color="#fff" /><Text style={s.actionBtnTxt}>Mark Attendance</Text>
          </TouchableOpacity>

          {attendanceRecords.length > 0 && <Text style={[s.secTitle, { marginTop: 16 }]}>Checked In ({attendanceRecords.length})</Text>}
          {attendanceRecords.map((r: any) => (
            <View key={r.id} style={s.matCard}>
              <MaterialIcons name="check-circle" size={20} color="#10b981" />
              <View style={{ flex: 1 }}><Text style={s.matTitle}>{r.user?.full_name || 'Unknown'}</Text><Text style={s.matSub}>{r.user?.employee_id} • {r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text></View>
              <View style={[s.badge, { backgroundColor: '#10b98122' }]}><Text style={[s.badgeTxt, { color: '#10b981' }]}>PRESENT</Text></View>
            </View>
          ))}
        </>)}

        {/* ═══ FEEDBACK TAB ═══ */}
        {tab === 'feedback' && (
          <View>
            <Text style={s.secTitle}>Session Feedback</Text>
            {!feedbackStats || feedbackStats.total_responses === 0 ? (
              <Text style={s.emptyTxt}>No feedback submitted yet.</Text>
            ) : (
              <>
                <View style={s.card}>
                  <Text style={{ fontSize: 13, color: C.tMuted, marginBottom: 12 }}>
                    Based on {feedbackStats.total_responses} response(s)
                  </Text>
                  {[
                    { label: 'Overall Rating', key: 'overall_rating' },
                    { label: 'Content Quality', key: 'content_quality' },
                    { label: 'Trainer Effectiveness', key: 'trainer_effectiveness' },
                    { label: 'Venue & Facilities', key: 'venue_facilities' },
                  ].map((item) => (
                    <View key={item.key} style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: C.t1 }}>{item.label}</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: C.primary }}>
                          {feedbackStats.averages[item.key]} / 5.0
                        </Text>
                      </View>
                      <View style={{ height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' }}>
                        <View style={{ height: '100%', backgroundColor: C.primary, width: `${(feedbackStats.averages[item.key] / 5.0) * 100}%` }} />
                      </View>
                    </View>
                  ))}
                </View>

                {/* Individual Comments */}
                {feedbackStats.comments && feedbackStats.comments.length > 0 && (
                  <View style={{ marginTop: 20 }}>
                    <Text style={[s.secTitle, { fontSize: 15 }]}>Recent Comments</Text>
                    {feedbackStats.comments.map((c: any, idx: number) => (
                      <View key={idx} style={[s.card, { padding: 12, marginBottom: 10, backgroundColor: C.card }]}>
                        <MaterialIcons name="format-quote" size={24} color={C.primary + '66'} style={{ marginBottom: 4 }} />
                        <Text style={{ fontSize: 14, color: C.t1, fontStyle: 'italic', lineHeight: 20 }}>"{c.text}"</Text>
                        {c.date && (
                          <Text style={{ fontSize: 11, color: C.tMuted, marginTop: 8, textAlign: 'right' }}>
                            {new Date(c.date).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

function DRow({ icon, label, val, C }: any) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}><MaterialIcons name={icon} size={20} color={C.tMuted} /><View style={{ flex: 1 }}><Text style={{ fontSize: 11, color: C.tMuted }}>{label}</Text><Text style={{ fontSize: 14, color: C.t1, fontWeight: '500' }}>{val}</Text></View></View>;
}
function fmt(iso: string) { 
  if (!iso) return 'TBD'; 
  try { 
    // Replace T with space and - with / to ensure cross-platform local time parsing
    const safeIso = iso.replace('T', ' ').replace(/-/g, '/');
    return new Date(safeIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); 
  } catch { 
    return 'TBD'; 
  } 
}
function getCol(s: string) { const m: any = { COMPLETED: '#10b981', PUBLISHED: '#3b82f6', ONGOING: '#f59e0b', DRAFT: '#94a3b8', CANCELLED: '#ef4444' }; return m[s] || '#94a3b8'; }

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.t1, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  tabActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabTxt: { fontSize: 13, fontWeight: '700', color: C.tMuted },
  tabTxtActive: { color: '#fff' },
  card: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, gap: 2 },
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 4 },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  secTitle: { fontSize: 16, fontWeight: '700', color: C.t1, marginBottom: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  chipAct: { backgroundColor: C.primary, borderColor: C.primary },
  chipTxt: { fontSize: 13, fontWeight: '600', color: C.tMuted },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.t1, marginTop: 8 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: C.primary + '44', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 18, marginTop: 10 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.primary, borderRadius: 10, paddingVertical: 12, marginTop: 14 },
  saveBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, marginTop: 14 },
  actionBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  matCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, marginTop: 8 },
  matTitle: { fontSize: 14, fontWeight: '600', color: C.t1 },
  matSub: { fontSize: 11, color: C.tMuted, marginTop: 2 },
  statBox: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '800' },
  statLbl: { fontSize: 11, color: C.tMuted, marginTop: 4 },
  emptyTxt: { color: C.tMuted, fontSize: 14, textAlign: 'center', marginTop: 20 },
});
