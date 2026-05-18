import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import flashcardsService from '../../services/flashcardsService';

const { width } = Dimensions.get('window');

export default function FlashcardsScreen({ navigation, route }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const topic = route?.params?.topic;
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFlashcards();
  }, [topic]);

  const fetchFlashcards = async () => {
    setIsLoading(true);
    try {
      const res = await flashcardsService.getFlashcards(topic);
      if (res.success && res.data) setFlashcards(res.data);
    } catch (err) {
      console.error('Failed to fetch flashcards:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev < flashcards.length - 1 ? prev + 1 : 0));
  };

  const handlePrev = () => {
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : flashcards.length - 1));
  };

  if (isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (flashcards.length === 0) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={C.t1} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Flashcards</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={s.center}>
          <MaterialIcons name="style" size={48} color={C.tMuted} />
          <Text style={s.emptyTxt}>No flashcards available{topic ? ` for "${topic}"` : ''}</Text>
        </View>
      </View>
    );
  }

  const card = flashcards[currentIndex];

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{currentIndex + 1} / {flashcards.length}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.cardContainer}>
        <TouchableOpacity style={s.flashcard} onPress={() => setShowAnswer(!showAnswer)} activeOpacity={0.9}>
          <Text style={s.cardLabel}>{showAnswer ? 'ANSWER' : 'QUESTION'}</Text>
          <Text style={s.cardText}>{showAnswer ? (card.answer || card.back_text || '') : (card.question || card.front_text || '')}</Text>
          <Text style={s.tapHint}>Tap to {showAnswer ? 'see question' : 'reveal answer'}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.navRow}>
        <TouchableOpacity style={s.navBtn} onPress={handlePrev}>
          <MaterialIcons name="chevron-left" size={32} color={C.t1} />
        </TouchableOpacity>
        <View style={s.progress}>
          {flashcards.map((_: any, idx: number) => (
            <View key={idx} style={[s.dot, idx === currentIndex && s.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={s.navBtn} onPress={handleNext}>
          <MaterialIcons name="chevron-right" size={32} color={C.t1} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.t1 },
  cardContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  flashcard: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 32, minHeight: 300, alignItems: 'center', justifyContent: 'center', gap: 16 },
  cardLabel: { fontSize: 11, fontWeight: '700', color: C.primary, letterSpacing: 1 },
  cardText: { fontSize: 20, fontWeight: '600', color: C.t1, textAlign: 'center', lineHeight: 28 },
  tapHint: { fontSize: 12, color: C.tMuted, fontStyle: 'italic' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 32, paddingTop: 16 },
  navBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  progress: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: width - 160 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
  dotActive: { backgroundColor: C.primary, width: 20 },
  emptyTxt: { color: C.tMuted, fontSize: 14 },
});
