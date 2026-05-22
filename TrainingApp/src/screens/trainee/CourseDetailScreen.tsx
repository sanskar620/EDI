import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking, AppState, AppStateStatus, Platform, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';
import * as ScreenCapture from 'expo-screen-capture';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useCourseStore } from '../../stores/courseStore';
import materialsService from '../../services/materialsService';
import courseService from '../../services/courseService';
import certificateService from '../../services/certificateService';

export default function CourseDetailScreen({ route, navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user } = useAuthStore();
  const { currentCourseMaterials, fetchCourseMaterials, deleteMaterial, updateProgress, isLoading } = useCourseStore();
  const { courseId, enrollment } = route.params;
  const course = enrollment?.course;

  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number; pct: number; passed: boolean } | null>(null);
  const [pastAttempts, setPastAttempts] = useState<any[]>([]);
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [downloadedFiles, setDownloadedFiles] = useState<Record<number, string>>({});
  const [localProgress, setLocalProgress] = useState(enrollment?.progress || 0);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);
  
  // Upload State
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [matTitle, setMatTitle] = useState('');
  const [matType, setMatType] = useState<'PDF' | 'VIDEO'>('PDF');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [matUrl, setMatUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const videoPlayer = useVideoPlayer(activeVideo?.uri || null, player => {
    player.loop = false;
    if (activeVideo?.uri) player.play();
  });

  // App state tracking for quiz anti-cheat
  const appState = useRef(AppState.currentState);
  const quizRef = useRef(activeQuiz);
  quizRef.current = activeQuiz;
  const answersRef = useRef(quizAnswers);
  answersRef.current = quizAnswers;
  const warnings = useRef(0);

  useEffect(() => {
    if (courseId) fetchCourseMaterials(courseId);
    loadDownloadedFiles();
    AsyncStorage.getItem(`course_${courseId}_completed`).then(res => {
      if (res) {
        const parsed = JSON.parse(res);
        setCompletedItems(new Set(parsed));
        if (currentCourseMaterials.length > 0) {
          setLocalProgress(Math.round((parsed.length / currentCourseMaterials.length) * 100));
        }
      }
    });
  }, [courseId, currentCourseMaterials.length]);

  // Screen capture prevention
  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync();
    return () => {
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  // App switch detection during quiz (3-strike system)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (quizRef.current && appState.current === 'active' && nextState.match(/inactive|background/)) {
        warnings.current += 1;
        if (warnings.current >= 3) {
          Alert.alert('⚠️ Assessment Failed', 'You have switched apps too many times. Your quiz will be auto-submitted.');
          if (quizRef.current) {
            submitQuizInternal(quizRef.current, answersRef.current, true);
          }
        } else {
          Alert.alert('Warning', `Please do not leave the app during the quiz. Warning ${warnings.current} of 3.`);
        }
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  const loadDownloadedFiles = async () => {
    try {
      const dir = `${FileSystem.documentDirectory}course_${courseId}/`;
      const info = await FileSystem.getInfoAsync(dir);
      if (info.exists) {
        const files = await FileSystem.readDirectoryAsync(dir);
        const map: Record<number, string> = {};
        files.forEach(f => {
          const match = f.match(/^material_(\d+)/);
          if (match) map[parseInt(match[1])] = dir + f;
        });
        setDownloadedFiles(map);
      }
    } catch {}
  };

  const handleDownload = async (material: any) => {
    if (!material.s3_key && !material.content_url) return;
    setDownloadingId(material.id);
    try {
      const dir = `${FileSystem.documentDirectory}course_${courseId}/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      
      let downloadUrl = material.content_url;
      if (material.s3_key && !material.s3_key.startsWith('http') && !material.s3_key.startsWith('file://')) {
        const urlResult = await materialsService.getDownloadUrl(material.s3_key);
        if (urlResult.success && urlResult.data) downloadUrl = urlResult.data.url;
      } else if (material.s3_key && (material.s3_key.startsWith('http') || material.s3_key.startsWith('file://'))) {
        downloadUrl = material.s3_key;
      }

      if (downloadUrl?.startsWith('file://')) {
        Alert.alert('Already Downloaded', 'This material is already available offline.');
        setDownloadingId(null);
        return;
      }

      const ext = (material.s3_key || material.content_url).split('.').pop()?.split('?')[0] || 'bin';
      const localPath = `${dir}material_${material.id}.${ext}`;

      const download = FileSystem.createDownloadResumable(downloadUrl, localPath);
      const result = await download.downloadAsync();
      if (result?.uri) {
        setDownloadedFiles(prev => ({ ...prev, [material.id]: result.uri }));
        Alert.alert('✅ Downloaded', `${material.title} saved for offline viewing`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Download failed');
    }
    setDownloadingId(null);
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: matType === 'VIDEO' ? 'video/*' : 'application/pdf',
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
    if (!matTitle.trim() || (!selectedFile && !matUrl.trim())) {
      Alert.alert('Error', 'Title and file are required');
      return;
    }
    setIsUploading(true);
    
    const fileToUpload = selectedFile || { uri: matUrl, name: matTitle, mimeType: 'application/octet-stream' };
    const order_index = currentCourseMaterials.length + 1;
    
    const res = await materialsService.uploadMaterial(fileToUpload, {
      title: matTitle.trim(),
      material_type: matType as any,
      topic: course?.topic || 'General',
      course_id: courseId,
      order_number: order_index
    });

    setIsUploading(false);
    if (!res.success) {
      Alert.alert('Error', res.error || 'Failed to upload material');
      return;
    }
    Alert.alert('Saved', 'Material uploaded successfully!');
    setMatTitle('');
    setMatUrl('');
    setSelectedFile(null);
    setShowUploadForm(false);
    fetchCourseMaterials(courseId);
  };

  const handleDownloadOffline = async (material: any) => {
    const localUri = downloadedFiles[material.id];
    if (!localUri) return;
    try {
      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
          await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, material.title, 'application/pdf')
            .then(async (uri) => {
              await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
              Alert.alert('Success', 'File downloaded to your device');
            });
        }
      } else {
        await Sharing.shareAsync(localUri);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to open file');
    }
  };

  const handleDeleteMaterial = (materialId: number, title: string) => {
    Alert.alert(
      'Delete Material',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setDeletingId(materialId);
            const res = await deleteMaterial(materialId);
            setDeletingId(null);
            if (!res.success) {
              Alert.alert('Error', res.error || 'Failed to delete material');
            } else {
              Alert.alert('Success', 'Material deleted successfully');
            }
          }
        }
      ]
    );
  };

  const handleMaterialPress = async (material: any) => {
    if (material.material_type === 'QUIZ') {
      // Load past attempts
      await loadQuizAttempts(material.id);
      setActiveQuiz(material);
      setQuizAnswers({});
      setQuizSubmitted(false);
      setQuizScore(null);
      return;
    }

    if (material.material_type === 'VIDEO') {
      let uri = downloadedFiles[material.id];
      if (!uri) {
         if (material.s3_key && !material.s3_key.startsWith('http')) {
           const urlResult = await materialsService.getDownloadUrl(material.s3_key);
           uri = urlResult.success ? urlResult.data.url : null;
         } else {
           uri = material.s3_key || material.content_url;
         }
      }
      if (uri) {
        setActiveVideo({ ...material, uri });
        markCompleted(material.id);
        return;
      }
    }

    // PDF/Document — open in-app via DocumentViewerScreen
    let uri = downloadedFiles[material.id];
    if (!uri) {
      if (material.s3_key && !material.s3_key.startsWith('http')) {
        const urlResult = await materialsService.getDownloadUrl(material.s3_key);
        uri = urlResult.success ? urlResult.data.url : null;
      } else {
        uri = material.s3_key || material.content_url;
      }
    }
    
    if (uri) {
      navigation.navigate('DocumentViewer', {
        title: material.title,
        uri: uri,
        materialType: material.material_type,
      });
    }

    markCompleted(material.id);
  };

  const markCompleted = async (materialId: number) => {
    const next = new Set(completedItems);
    next.add(materialId);
    setCompletedItems(next);
    AsyncStorage.setItem(`course_${courseId}_completed`, JSON.stringify(Array.from(next)));
    
    // Only update backend progress if the user is a trainee
    if (user?.role === 'TRAINEE') {
      if (currentCourseMaterials.length > 0) {
        const newProgress = Math.min(Math.round((next.size / currentCourseMaterials.length) * 100), 100);
        setLocalProgress(newProgress);
        if (user?.id) {
          await updateProgress(courseId, user.id, newProgress);
        }
      }
    }
  };

  const loadQuizAttempts = async (materialId: number) => {
    if (!user?.id) return;
    const res = await courseService.getCourseQuizAttempts(materialId);
    if (res.success && res.data) {
      setPastAttempts(res.data || []);
    }
  };

  const handleQuizAutoSubmit = () => {
    if (!quizRef.current?.quiz_data?.questions) return;
    submitQuizInternal(quizRef.current, answersRef.current, true);
  };

  const handleQuizSubmit = async () => {
    if (!activeQuiz?.quiz_data?.questions) return;
    const questions = activeQuiz.quiz_data.questions;
    if (Object.keys(quizAnswers).length < questions.length) {
      Alert.alert('Incomplete', 'Please answer all questions before submitting');
      return;
    }
    submitQuizInternal(activeQuiz, quizAnswers, false);
  };

  const submitQuizInternal = async (quiz: any, answers: Record<number, number>, autoSubmitted: boolean) => {
    const questions = quiz.quiz_data?.questions || [];
    let correct = 0;
    questions.forEach((q: any) => {
      const correctAns = q.correct !== undefined ? q.correct : q.correctIndex;
      if (answers[q.id] === correctAns) correct++;
    });
    const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    const passed = pct >= 70;

    setQuizSubmitted(true);
    setQuizScore({ correct, total: questions.length, pct, passed });

    // Save to API
    await courseService.submitCourseQuizAttempt(quiz.id, {
      course_id: courseId,
      score: pct,
      total_questions: questions.length,
      correct_answers: correct,
      passed,
      answers_json: answers,
    });

    if (passed) {
      markCompleted(quiz.id);
    }

    if (autoSubmitted) {
      setQuizSubmitted(true);
    }
  };

  const handleRetakeQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
  };

  const handleGenerateCertificate = async () => {
    if (!user?.id || !courseId) return;
    setIsGeneratingCert(true);
    try {
      const res = await certificateService.generateCertificate(user.id, undefined, courseId);
      if (res.success && res.data) {
        // Open the viewer inside the app
        const certUrl = res.data.certificate_s3_key;
        if (certUrl) {
          const { API_BASE_URL } = require('../../services/api');
          const url = certUrl.startsWith('http') ? certUrl : `${API_BASE_URL.replace('/api/v1', '')}${certUrl}`;
          
          navigation.navigate('DocumentViewer', {
            title: (course?.title || 'Course Certificate'),
            uri: url,
            materialType: 'IMAGE',
          });
        } else {
          Alert.alert('Success', 'Certificate generated successfully! You can find it in your profile.');
        }
      } else {
        Alert.alert('Error', res.error || 'Failed to generate certificate');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsGeneratingCert(false);
    }
  };

  const getMaterialIcon = (type: string): any => {
    switch (type) {
      case 'VIDEO': return 'play-circle-filled';
      case 'PDF': return 'picture-as-pdf';
      case 'QUIZ': return 'quiz';
      case 'DOCUMENT': return 'description';
      default: return 'insert-drive-file';
    }
  };

  const getMaterialColor = (type: string) => {
    switch (type) {
      case 'VIDEO': return '#3b82f6';
      case 'PDF': return '#ef4444';
      case 'QUIZ': return '#f59e0b';
      case 'DOCUMENT': return '#10b981';
      default: return '#6b7280';
    }
  };

  // ── VIDEO PLAYER ──
  if (activeVideo) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setActiveVideo(null)}>
            <MaterialIcons name="arrow-back" size={24} color={C.t1} />
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{activeVideo.title}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
          <VideoView
            player={videoPlayer}
            style={{ width: '100%', height: 300 }}
          />
        </View>
        <View style={{ padding: 16 }}>
          {activeVideo.description && <Text style={s.courseDesc}>{activeVideo.description}</Text>}
        </View>
      </View>
    );
  }

  // ── QUIZ VIEW ──
  if (activeQuiz) {
    const questions = activeQuiz.quiz_data?.questions || [];
    return (
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => { if (!quizSubmitted) { Alert.alert('Leave Quiz?', 'Your progress will be lost.', [{ text: 'Stay' }, { text: 'Leave', style: 'destructive', onPress: () => setActiveQuiz(null) }]); } else { setActiveQuiz(null); } }}>
            <MaterialIcons name="arrow-back" size={24} color={C.t1} />
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{activeQuiz.title}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Past attempts banner */}
        {pastAttempts.length > 0 && !quizSubmitted && (
          <View style={s.attemptsBanner}>
            <MaterialIcons name="history" size={18} color="#f59e0b" />
            <Text style={s.attemptsText}>
              Attempt #{pastAttempts.length + 1} • Best: {Math.max(...pastAttempts.map((a: any) => a.score))}%
            </Text>
          </View>
        )}

        {/* Score Result Card */}
        {quizSubmitted && quizScore && (
          <View style={[s.scoreCard, { backgroundColor: quizScore.passed ? '#10b98118' : '#ef444418' }]}>
            <Text style={s.scoreEmoji}>{quizScore.passed ? '🎉' : '😔'}</Text>
            <Text style={[s.scoreTitle, { color: quizScore.passed ? '#10b981' : '#ef4444' }]}>
              {quizScore.passed ? 'PASSED!' : 'FAILED'}
            </Text>
            <Text style={s.scorePct}>{quizScore.correct}/{quizScore.total} correct ({quizScore.pct}%)</Text>
            <Text style={s.scoreThreshold}>Passing: 70%</Text>
            {!quizScore.passed && (
              <TouchableOpacity style={s.retakeBtn} onPress={handleRetakeQuiz}>
                <MaterialIcons name="refresh" size={20} color="#fff" />
                <Text style={s.retakeBtnTxt}>Retake Quiz</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {questions.map((q: any, qi: number) => (
            <View key={q.id} style={s.questionCard}>
              <Text style={s.questionNum}>Question {qi + 1}</Text>
              <Text style={s.questionText}>{q.question}</Text>
              <View style={s.optionsList}>
                {q.options.map((opt: string, oi: number) => {
                  const correctAns = q.correct !== undefined ? q.correct : q.correctIndex;
                  const selected = quizAnswers[q.id] === oi;
                  const isCorrect = quizSubmitted && oi === correctAns;
                  const isWrong = quizSubmitted && selected && oi !== correctAns;

                  return (
                    <TouchableOpacity
                      key={oi}
                      style={[s.optionBtn, selected && s.optionBtnSelected, isCorrect && s.optionBtnCorrect, isWrong && s.optionBtnWrong]}
                      onPress={() => { if (!quizSubmitted) setQuizAnswers({ ...quizAnswers, [q.id]: oi }); }}
                      disabled={quizSubmitted}
                    >
                      <View style={[s.optionRadio, selected && s.optionRadioSelected, isCorrect && s.optionRadioCorrect]}>
                        {(selected || isCorrect) && <View style={s.optionRadioDot} />}
                      </View>
                      <Text style={[s.optionText, selected && s.optionTextSelected]}>{opt}</Text>
                      {isCorrect && <MaterialIcons name="check-circle" size={18} color="#10b981" />}
                      {isWrong && <MaterialIcons name="cancel" size={18} color="#ef4444" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {!quizSubmitted && (
            <TouchableOpacity style={s.submitBtn} onPress={handleQuizSubmit}>
              <MaterialIcons name="send" size={20} color="#fff" />
              <Text style={s.submitBtnTxt}>Submit Quiz</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── MAIN COURSE DETAIL VIEW ──
  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{course?.title || 'Course'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.infoSection}>
          <View style={[s.topicBadge, { backgroundColor: '#3b82f618' }]}>
            <Text style={[s.topicTxt, { color: '#3b82f6' }]}>{(course?.topic || 'General').toUpperCase()}</Text>
          </View>
          <Text style={s.courseTitle}>{course?.title}</Text>
          {course?.description && <Text style={s.courseDesc}>{course.description}</Text>}

          {user?.role === 'TRAINEE' && (
            <View style={s.progressCard}>
              <Text style={s.progressLabel}>Your Progress</Text>
              <View style={s.progressRow}>
                <View style={s.progressBarBg}>
                  <View style={[s.progressBarFill, { width: `${Math.min(localProgress, 100)}%` }]} />
                </View>
                <Text style={s.progressPct}>{Math.min(Math.round(localProgress), 100)}%</Text>
              </View>
              <Text style={s.progressSub}>{completedItems.size}/{currentCourseMaterials.length} items completed</Text>
            </View>
          )}
        </View>

        <View style={s.materialsSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={s.sectionTitle}>Course Content</Text>
            {(user?.role === 'TRAINER' || user?.role === 'SUPERVISOR') && (
              <TouchableOpacity style={{ backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }} onPress={() => setShowUploadForm(!showUploadForm)}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{showUploadForm ? 'Cancel' : '+ Add Material'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {showUploadForm && (
            <View style={{ backgroundColor: C.bg, padding: 14, marginBottom: 16, borderRadius: 12, borderWidth: 1, borderColor: C.primary + '66' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.t1, marginBottom: 8 }}>Upload New Material</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                {(['PDF', 'VIDEO'] as const).map(t => (
                  <TouchableOpacity key={t} style={[s.chip, matType === t && { backgroundColor: C.primary, borderColor: C.primary }, { paddingVertical: 6, paddingHorizontal: 10 }]} onPress={() => setMatType(t)}>
                    <Text style={[s.chipTxt, { fontSize: 11 }, matType === t && { color: '#fff' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={s.uploadInput} placeholder="Material Title" placeholderTextColor={C.tMuted} value={matTitle} onChangeText={setMatTitle} />
              
              <TouchableOpacity style={[s.uploadBtnArea, { paddingVertical: 12, marginTop: 8 }]} onPress={handlePickFile} disabled={isUploading}>
                {isUploading ? (
                  <ActivityIndicator color={C.primary} />
                ) : (
                  <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>{matUrl ? '✅ File Selected' : '📂 Pick File from Device'}</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity style={s.actionBtn} onPress={handleSaveMaterial} disabled={isUploading}>
                {isUploading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.actionBtnTxt}>Upload to Course</Text>}
              </TouchableOpacity>
            </View>
          )}

          {isLoading ? (
            <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 20 }} />
          ) : currentCourseMaterials.length === 0 ? (
            <View style={s.emptyCard}>
              <MaterialIcons name="folder-open" size={40} color={C.tMuted} />
              <Text style={s.emptyTxt}>No materials added yet</Text>
            </View>
          ) : (
            <View style={s.materialsList}>
              {currentCourseMaterials.map((material: any, index: number) => {
                const color = getMaterialColor(material.material_type);
                const isCompleted = completedItems.has(material.id);
                const isDownloaded = !!downloadedFiles[material.id];

                return (
                  <TouchableOpacity key={material.id} style={s.materialCard} onPress={() => handleMaterialPress(material)}>
                    <View style={s.materialLeft}>
                      <View style={[s.materialNumCircle, isCompleted && { backgroundColor: '#10b981' }]}>
                        {isCompleted ? (
                          <MaterialIcons name="check" size={16} color="#fff" />
                        ) : (
                          <Text style={s.materialNum}>{index + 1}</Text>
                        )}
                      </View>
                    </View>
                    <View style={s.materialBody}>
                      <Text style={s.materialTitle}>{material.title}</Text>
                      {material.description && <Text style={s.materialDesc} numberOfLines={2}>{material.description}</Text>}
                      <View style={s.materialMeta}>
                        <View style={[s.materialTypeBadge, { backgroundColor: color + '18' }]}>
                          <MaterialIcons name={getMaterialIcon(material.material_type)} size={12} color={color} />
                          <Text style={[s.materialTypeTxt, { color }]}>{material.material_type}</Text>
                        </View>
                        {material.duration_seconds && (
                          <Text style={s.durationTxt}>{Math.round(material.duration_seconds / 60)} min</Text>
                        )}
                        {isDownloaded && (
                          <View style={s.downloadedBadge}>
                            <MaterialIcons name="offline-pin" size={12} color="#10b981" />
                            <Text style={s.downloadedTxt}>Offline</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      <MaterialIcons
                        name={material.material_type === 'QUIZ' ? 'quiz' : 'play-arrow'}
                        size={24}
                        color={C.primary}
                      />
                      {material.material_type !== 'QUIZ' && !isDownloaded && (
                        <TouchableOpacity onPress={() => handleDownload(material)} disabled={downloadingId === material.id}>
                          {downloadingId === material.id ? (
                            <ActivityIndicator size="small" color={C.primary} />
                          ) : (
                            <MaterialIcons name="download" size={20} color={C.tMuted} />
                          )}
                        </TouchableOpacity>
                      )}
                      {(user?.role === 'SUPERVISOR' || user?.role === 'TRAINER') && (
                        <TouchableOpacity onPress={() => handleDeleteMaterial(material.id, material.title)} disabled={deletingId === material.id}>
                          {deletingId === material.id ? (
                            <ActivityIndicator size="small" color="#ef4444" />
                          ) : (
                            <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Course Completion / Certificate */}
        {localProgress >= 100 && (
          <View style={{ padding: 16, marginTop: 10, marginBottom: 40 }}>
            <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: '#10b98144', padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
              <MaterialIcons name="workspace-premium" size={64} color="#10b981" />
              <Text style={{ fontSize: 20, fontWeight: '900', color: C.t1, marginTop: 16 }}>Congratulations!</Text>
              <Text style={{ fontSize: 14, color: C.tMuted, textAlign: 'center', marginTop: 6, marginBottom: 20, lineHeight: 20 }}>
                You have achieved 100% completion in this course. You are now eligible for your official certificate.
              </Text>
              <TouchableOpacity 
                style={{ backgroundColor: '#10b981', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', justifyContent: 'center' }}
                onPress={handleGenerateCertificate}
                disabled={isGeneratingCert}
              >
                {isGeneratingCert ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="card-membership" size={22} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Claim Your Certificate</Text>
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

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.t1, flex: 1, textAlign: 'center' },
  infoSection: { padding: 16, gap: 10 },
  topicBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  topicTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  courseTitle: { fontSize: 22, fontWeight: '800', color: C.t1, lineHeight: 28 },
  courseDesc: { fontSize: 14, color: C.tMuted, lineHeight: 20 },
  progressCard: { backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, gap: 8, marginTop: 4 },
  progressLabel: { fontSize: 13, fontWeight: '700', color: C.tMuted },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBarBg: { flex: 1, height: 10, backgroundColor: C.border, borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5, backgroundColor: '#3b82f6' },
  progressPct: { fontSize: 16, fontWeight: '800', color: C.t1, minWidth: 40 },
  progressSub: { fontSize: 12, color: C.tMuted },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  chipTxt: { fontSize: 13, fontWeight: '600', color: C.tMuted },
  uploadInput: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: C.t1, marginTop: 4 },
  uploadBtnArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: C.primary + '44', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 18, marginTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, marginTop: 14 },
  actionBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  materialsSection: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.t1, marginBottom: 12 },
  materialsList: { gap: 10 },
  materialCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border, gap: 12 },
  materialLeft: {},
  materialNumCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.primary + '22', alignItems: 'center', justifyContent: 'center' },
  materialNum: { fontSize: 14, fontWeight: '700', color: C.primary },
  materialBody: { flex: 1, gap: 4 },
  materialTitle: { fontSize: 15, fontWeight: '700', color: C.t1 },
  materialDesc: { fontSize: 12, color: C.tMuted, lineHeight: 16 },
  materialMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  materialTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  materialTypeTxt: { fontSize: 10, fontWeight: '700' },
  durationTxt: { fontSize: 11, color: C.tMuted },
  downloadedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#10b98118', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  downloadedTxt: { fontSize: 10, fontWeight: '700', color: '#10b981' },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTxt: { fontSize: 14, color: C.tMuted },
  // Quiz
  attemptsBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f59e0b18', paddingHorizontal: 16, paddingVertical: 10 },
  attemptsText: { fontSize: 13, fontWeight: '600', color: '#f59e0b' },
  scoreCard: { margin: 16, borderRadius: 16, padding: 24, alignItems: 'center', gap: 8 },
  scoreEmoji: { fontSize: 48 },
  scoreTitle: { fontSize: 24, fontWeight: '900' },
  scorePct: { fontSize: 16, fontWeight: '600', color: C.t1 },
  scoreThreshold: { fontSize: 12, color: C.tMuted },
  retakeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f59e0b', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 12 },
  retakeBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  questionCard: { backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 14, gap: 10 },
  questionNum: { fontSize: 11, fontWeight: '700', color: C.primary, textTransform: 'uppercase' },
  questionText: { fontSize: 16, fontWeight: '700', color: C.t1, lineHeight: 22 },
  optionsList: { gap: 8 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  optionBtnSelected: { borderColor: C.primary, backgroundColor: C.primary + '10' },
  optionBtnCorrect: { borderColor: '#10b981', backgroundColor: '#10b98115' },
  optionBtnWrong: { borderColor: '#ef4444', backgroundColor: '#ef444415' },
  optionRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  optionRadioSelected: { borderColor: C.primary },
  optionRadioCorrect: { borderColor: '#10b981' },
  optionRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
  optionText: { flex: 1, fontSize: 14, color: C.t1 },
  optionTextSelected: { fontWeight: '600' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, marginTop: 8 },
  submitBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
