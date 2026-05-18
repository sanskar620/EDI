import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';

export default function ResultsScreen({ navigation, route }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const result = route?.params?.assessmentResult;

  const score = result?.score_percentage || 0;
  const passed = result?.passed ?? score >= 70;
  const totalQuestions = result?.total_questions || 0;
  const correctAnswers = result?.correct_answers || 0;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Assessment Results</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.resultCard, passed ? s.passCard : s.failCard]}>
          <MaterialIcons name={passed ? 'emoji-events' : 'sentiment-dissatisfied'} size={64} color={passed ? '#f59e0b' : C.error} />
          <Text style={[s.resultTitle, { color: passed ? C.success : C.error }]}>
            {passed ? 'Congratulations! 🎉' : 'Keep Trying 💪'}
          </Text>
          <Text style={s.resultSub}>{passed ? 'You passed the assessment!' : 'You did not meet the passing threshold'}</Text>
        </View>

        <View style={s.scoreSection}>
          <View style={s.scoreCircle}>
            <Text style={s.scoreVal}>{Math.round(score)}%</Text>
            <Text style={s.scoreLbl}>Score</Text>
          </View>
        </View>

        <View style={s.statsCard}>
          <View style={s.statRow}>
            <View style={s.statItem}>
              <MaterialIcons name="check-circle" size={20} color={C.success} />
              <Text style={s.statLabel}>Correct</Text>
              <Text style={s.statValue}>{correctAnswers}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.statItem}>
              <MaterialIcons name="cancel" size={20} color={C.error} />
              <Text style={s.statLabel}>Wrong</Text>
              <Text style={s.statValue}>{totalQuestions - correctAnswers}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.statItem}>
              <MaterialIcons name="help" size={20} color={C.tMuted} />
              <Text style={s.statLabel}>Total</Text>
              <Text style={s.statValue}>{totalQuestions}</Text>
            </View>
          </View>
        </View>

        {!passed && (
          <TouchableOpacity style={s.retryBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="refresh" size={20} color={C.white} />
            <Text style={s.retryBtnTxt}>Retake Assessment</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={s.homeBtn} onPress={() => navigation.navigate('DashboardTab')}>
          <Text style={s.homeBtnTxt}>Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  content: { padding: 20, alignItems: 'center', gap: 20 },
  resultCard: { width: '100%', borderRadius: 16, padding: 32, alignItems: 'center', gap: 12 },
  passCard: { backgroundColor: 'rgba(16,185,129,0.1)' },
  failCard: { backgroundColor: 'rgba(239,68,68,0.1)' },
  resultTitle: { fontSize: 22, fontWeight: '800' },
  resultSub: { fontSize: 14, color: C.tMuted, textAlign: 'center' },
  scoreSection: { marginVertical: 8 },
  scoreCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 6, borderColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  scoreVal: { fontSize: 32, fontWeight: '800', color: C.t1 },
  scoreLbl: { fontSize: 12, color: C.tMuted },
  statsCard: { width: '100%', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 20 },
  statRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center', gap: 8 },
  statLabel: { fontSize: 12, color: C.tMuted },
  statValue: { fontSize: 20, fontWeight: '800', color: C.t1 },
  divider: { width: 1, height: 48, backgroundColor: C.border },
  retryBtn: { flexDirection: 'row', backgroundColor: C.warning, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center', gap: 8 },
  retryBtnTxt: { color: C.white, fontSize: 15, fontWeight: '700' },
  homeBtn: { paddingVertical: 14, paddingHorizontal: 32 },
  homeBtnTxt: { color: C.primary, fontSize: 15, fontWeight: '700' },
});
