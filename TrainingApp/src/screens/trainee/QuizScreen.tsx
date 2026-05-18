import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, AppState, AppStateStatus } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ScreenCapture from 'expo-screen-capture';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useAssessmentStore } from '../../stores/assessmentStore';
import assessmentsService from '../../services/assessmentsService';
import sessionsService from '../../services/sessionsService';
import notificationsService from '../../services/notificationsService';

export default function QuizScreen({ navigation, route }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user } = useAuthStore();
  const { questions, currentAssessment, isLoading, fetchQuestions, startAssessment, submitAnswer, submitAssessment, clearCurrentAssessment } = useAssessmentStore();

  const sessionId = route?.params?.sessionId;
  const assessmentType = route?.params?.type || 'POST_TEST';
  const topic = route?.params?.topic;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [started, setStarted] = useState(false);
  const [pastAttempt, setPastAttempt] = useState<any | null>(null);
  
  const appState = useRef(AppState.currentState);
  const warnings = useRef(0);

  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync();
    return () => {
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  useEffect(() => {
    const checkPastAttempts = async () => {
      if (user?.id) {
        // We fetch the history and check if we already took this specific test
        const res = await assessmentsService.getUserAssessmentHistory(user.id);
        if (res.success && res.data) {
          const past = res.data.find((a: any) => a.session_id === sessionId && a.assessment_type === assessmentType);
          if (past) {
            setPastAttempt(past);
          }
        }
      }
    };
    checkPastAttempts();
  }, [sessionId, assessmentType, user?.id]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [started]);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appState.current.match(/active/) && nextAppState.match(/inactive|background/) && started) {
      warnings.current += 1;
      if (warnings.current >= 3) {
        Alert.alert('Assessment Failed', 'You have switched apps too many times. Your assessment has been automatically submitted.');
        if (currentAssessment && user?.id) {
          // Notify Trainer
          try {
            const res = await sessionsService.getSessionById(sessionId);
            if (res.success && res.data) {
              const sessionData = res.data;
              await notificationsService.createNotification(
                sessionData.trainer_id,
                'SYSTEM_ALERT' as any,
                'Cheating Detected',
                `${user?.full_name || 'A trainee'} failed ${sessionData.title} ${assessmentType} due to app switching.`,
                { session_id: sessionId, user_id: user.id }
              );
            }
          } catch (e) {}

          const result = await submitAssessment(currentAssessment.id, user.id);
          if (result) {
            navigation.replace('Results', { assessmentResult: result });
          }
        } else {
          navigation.goBack();
        }
      } else {
        Alert.alert('Warning', `Please do not leave the app during the quiz. Warning ${warnings.current} of 3.`);
      }
    }
    appState.current = nextAppState;
  };

  useEffect(() => {
    // Fetch questions scoped to this session's topic AND sessionId and assessmentType
    if (sessionId) {
      fetchQuestions({ topic, sessionId, assessmentType });
    }
    return () => clearCurrentAssessment();
  }, [sessionId, topic, assessmentType]);

  const handleStart = async () => {
    if (!user?.id || !sessionId) return;
    const result = await startAssessment(sessionId, user.id, assessmentType);
    if (result) {
      setStarted(true);
    } else {
      Alert.alert('Error', 'Failed to start assessment');
    }
  };

  const handleSelectAnswer = (answer: string) => {
    setSelectedAnswer(answer);
  };

  const handleNext = async () => {
    if (!selectedAnswer || !currentAssessment || !user?.id) return;

    const question = questions[currentIndex];
    await submitAnswer(currentAssessment.id, user.id, question.id, selectedAnswer);

    setAnswers((prev) => ({ ...prev, [question.id]: selectedAnswer }));
    setSelectedAnswer(null);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (!currentAssessment || !user?.id) return;

    // Submit the last answer if selected
    if (selectedAnswer) {
      const question = questions[currentIndex];
      await submitAnswer(currentAssessment.id, user.id, question.id, selectedAnswer);
    }

    Alert.alert('Submit Assessment', 'Are you sure you want to submit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        onPress: async () => {
          const result = await submitAssessment(currentAssessment.id, user!.id);
          if (result) {
            navigation.replace('Results', { assessmentResult: result });
          } else {
            Alert.alert('Error', 'Failed to submit assessment');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.loadingTxt}>Loading assessment...</Text>
      </View>
    );
  }

  if (!started) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={C.t1} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Assessment</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={s.startCard}>
          <MaterialIcons name="quiz" size={64} color={C.primary} />
          <Text style={s.startTitle}>{assessmentType.replace('_', ' ')}</Text>
          
          {pastAttempt ? (
            <View style={{ alignItems: 'center', backgroundColor: C.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginVertical: 12, width: '100%' }}>
              <Text style={{ fontSize: 16, color: C.tMuted }}>Previous Score</Text>
              <Text style={{ fontSize: 32, fontWeight: '800', color: pastAttempt.passed ? C.success : C.warning }}>
                {(pastAttempt.score_percentage ?? pastAttempt.score ?? 0).toFixed(1)}%
              </Text>
              <Text style={{ fontSize: 14, color: pastAttempt.passed ? C.success : C.warning, fontWeight: '600', marginTop: 4 }}>
                {pastAttempt.passed ? 'PASSED' : 'FAILED'}
              </Text>
            </View>
          ) : (
            <Text style={s.startSub}>{questions.length} questions</Text>
          )}

          <Text style={s.startDesc}>Answer all questions carefully. Do not leave the app during the quiz, or it will be auto-submitted.</Text>
          {pastAttempt && pastAttempt.passed ? (
            <View style={{ marginTop: 24, padding: 16, backgroundColor: C.success + '22', borderRadius: 12 }}>
              <Text style={{ color: C.success, fontWeight: '700', textAlign: 'center' }}>You have already passed this assessment!</Text>
            </View>
          ) : (
            <TouchableOpacity style={s.startBtn} onPress={handleStart}>
              <Text style={s.startBtnTxt}>{pastAttempt ? 'Retake Assessment' : 'Start Assessment'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={[s.root, s.center]}>
        <MaterialIcons name="help-outline" size={48} color={C.tMuted} />
        <Text style={s.emptyTxt}>No questions available for this assessment</Text>
      </View>
    );
  }

  const question = questions[currentIndex];

  // Normalize options: DB may store as JSON string of [{text, is_correct}] or as string[]
  const rawOptions = question.options || [];
  const parsedOptions: string[] = (() => {
    let opts = rawOptions;
    // If it's a JSON string, parse it first
    if (typeof opts === 'string') {
      try { opts = JSON.parse(opts); } catch { return []; }
    }
    if (!Array.isArray(opts)) return [];
    // If array of objects like [{text: "...", is_correct: true}], extract text
    if (opts.length > 0 && typeof opts[0] === 'object' && opts[0] !== null && 'text' in opts[0]) {
      return opts.map((o: any) => o.text);
    }
    // Already plain string array
    return opts.map((o: any) => String(o));
  })();

  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Question {currentIndex + 1} / {questions.length}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress bar */}
      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: `${((currentIndex + 1) / questions.length) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={s.questionContainer}>
        <Text style={s.questionText}>{question.question_text}</Text>

        <View style={s.optionsContainer}>
          {parsedOptions.map((option: string, index: number) => (
            <TouchableOpacity
              key={index}
              style={[s.optionCard, selectedAnswer === option && s.optionSelected]}
              onPress={() => handleSelectAnswer(option)}
            >
              <View style={[s.optionRadio, selectedAnswer === option && s.optionRadioSelected]}>
                {selectedAnswer === option && <View style={s.optionRadioDot} />}
              </View>
              <Text style={[s.optionText, selectedAnswer === option && s.optionTextSelected]}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={s.footer}>
        {isLastQuestion ? (
          <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={!selectedAnswer && !answers[question.id]}>
            <Text style={s.submitBtnTxt}>Submit Assessment</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[s.nextBtn, !selectedAnswer && s.btnDisabled]} onPress={handleNext} disabled={!selectedAnswer}>
            <Text style={s.nextBtnTxt}>Next</Text>
            <MaterialIcons name="arrow-forward" size={20} color={C.white} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.t1 },
  progressBar: { height: 4, backgroundColor: C.border, marginHorizontal: 16, borderRadius: 2, marginTop: 8 },
  progressFill: { height: '100%', backgroundColor: C.primary, borderRadius: 2 },
  questionContainer: { padding: 20, paddingBottom: 100 },
  questionText: { fontSize: 18, fontWeight: '700', color: C.t1, lineHeight: 26, marginBottom: 24 },
  optionsContainer: { gap: 12 },
  optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, borderWidth: 2, borderColor: C.border, padding: 16, gap: 14 },
  optionSelected: { borderColor: C.primary, backgroundColor: C.primary + '10' },
  optionRadio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  optionRadioSelected: { borderColor: C.primary },
  optionRadioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.primary },
  optionText: { flex: 1, fontSize: 15, color: C.t1, lineHeight: 22 },
  optionTextSelected: { fontWeight: '600', color: C.primary },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border },
  nextBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextBtnTxt: { color: C.white, fontSize: 16, fontWeight: '700' },
  submitBtn: { backgroundColor: C.success, borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  submitBtnTxt: { color: C.white, fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  loadingTxt: { color: C.tMuted, marginTop: 12 },
  startCard: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  startTitle: { fontSize: 22, fontWeight: '800', color: C.t1 },
  startSub: { fontSize: 14, color: C.tMuted },
  startDesc: { fontSize: 14, color: C.tMuted, textAlign: 'center', lineHeight: 20 },
  startBtn: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 40, paddingVertical: 16, marginTop: 12 },
  startBtnTxt: { color: C.white, fontSize: 16, fontWeight: '700' },
  emptyTxt: { color: C.tMuted, fontSize: 14, marginTop: 12 },
});
