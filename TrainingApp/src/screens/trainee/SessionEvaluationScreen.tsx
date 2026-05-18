import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import sessionsService from '../../services/sessionsService';

export default function SessionEvaluationScreen({ navigation, route }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user } = useAuthStore();
  const session = route?.params?.session;
  const [isLoading, setIsLoading] = useState(false);

  const [ratings, setRatings] = useState({
    content_quality: 0,
    trainer_effectiveness: 0,
    materials_quality: 0,
    venue_facilities: 0,
    overall: 0,
  });
  const [comments, setComments] = useState('');

  const setRating = (key: string, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!user?.id || !session?.id) {
      Alert.alert('Error', 'Missing user or session info');
      return;
    }

    if (ratings.overall === 0) {
      Alert.alert('Validation', 'Please provide an overall rating');
      return;
    }

    setIsLoading(true);
    try {
      const result = await sessionsService.submitSessionFeedback(session.id, {
        content_quality: ratings.content_quality,
        trainer_effectiveness: ratings.trainer_effectiveness,
        materials_quality: ratings.materials_quality,
        venue_facilities: ratings.venue_facilities,
        overall_rating: ratings.overall,
        comments: comments.trim() || null,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to submit feedback');
      } else {
        Alert.alert('Thank you!', 'Your feedback has been submitted.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit feedback');
    } finally {
      setIsLoading(false);
    }
  };

  const StarRating = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <View style={s.ratingRow}>
      <Text style={s.ratingLabel}>{label}</Text>
      <View style={s.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => onChange(star)}>
            <MaterialIcons name={star <= value ? 'star' : 'star-border'} size={28} color={star <= value ? '#f59e0b' : C.tMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Session Evaluation</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {session && (
          <View style={s.sessionInfo}>
            <Text style={s.sessionTitle}>{session.title}</Text>
            <Text style={s.sessionSub}>{session.trainer_name || 'Trainer'}</Text>
          </View>
        )}

        <View style={s.form}>
          <StarRating label="Content Quality" value={ratings.content_quality} onChange={(v) => setRating('content_quality', v)} />
          <StarRating label="Trainer Effectiveness" value={ratings.trainer_effectiveness} onChange={(v) => setRating('trainer_effectiveness', v)} />
          <StarRating label="Materials Quality" value={ratings.materials_quality} onChange={(v) => setRating('materials_quality', v)} />
          <StarRating label="Venue & Facilities" value={ratings.venue_facilities} onChange={(v) => setRating('venue_facilities', v)} />
          <StarRating label="Overall Rating" value={ratings.overall} onChange={(v) => setRating('overall', v)} />

          <Text style={s.label}>Additional Comments</Text>
          <TextInput
            style={s.textArea}
            placeholder="Share your thoughts about this session..."
            placeholderTextColor={C.tMuted}
            multiline
            numberOfLines={4}
            value={comments}
            onChangeText={setComments}
          />

          <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <MaterialIcons name="send" size={18} color={C.white} />
                <Text style={s.submitBtnTxt}>Submit Feedback</Text>
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
  sessionInfo: { marginHorizontal: 16, marginTop: 16, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, gap: 4 },
  sessionTitle: { fontSize: 16, fontWeight: '700', color: C.t1 },
  sessionSub: { fontSize: 13, color: C.tMuted },
  form: { padding: 16, gap: 8 },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  ratingLabel: { fontSize: 14, fontWeight: '600', color: C.t1, flex: 1 },
  stars: { flexDirection: 'row', gap: 2 },
  label: { fontSize: 13, fontWeight: '600', color: C.tMuted, marginTop: 16, marginBottom: 6 },
  textArea: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, fontSize: 14, color: C.t1, minHeight: 100, textAlignVertical: 'top' },
  submitBtn: { flexDirection: 'row', backgroundColor: C.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  submitBtnTxt: { color: C.white, fontSize: 16, fontWeight: '700' },
});
