import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGES = [
  { id: 'en', name: 'English', native: 'English' },
  { id: 'hi', name: 'Hindi', native: 'हिंदी' },
  { id: 'bn', name: 'Bengali', native: 'বাংলা' },
  { id: 'te', name: 'Telugu', native: 'తెలుగు' },
  { id: 'mr', name: 'Marathi', native: 'मराठी' },
  { id: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { id: 'ur', name: 'Urdu', native: 'اردو' },
  { id: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
];

export default function LanguagePickerScreen({ navigation, route }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const [selected, setSelected] = useState('en');

  // Determine context from route params
  const isFirstLaunch = route?.params?.isFirstLaunch ?? false;

  useEffect(() => {
    loadLanguagePreference();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      const stored = await AsyncStorage.getItem('user_language');
      if (stored) setSelected(stored);
    } catch (e) {
      console.error('Failed to load language', e);
    }
  };

  const handleSelect = async (langId: string) => {
    setSelected(langId);
    try {
      await AsyncStorage.setItem('user_language', langId);
    } catch (e) {
      console.error('Failed to save language', e);
    }
  };

  const handleContinue = () => {
    if (isFirstLaunch) {
      // If it's the very first time the app is opened, continue to Login flow
      navigation.replace('Login');
    } else {
      // Otherwise, it was opened from settings, go back
      navigation.goBack();
    }
  };

  return (
    <View style={s.root}>
      {!isFirstLaunch && (
        <View style={s.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <MaterialIcons name="arrow-back" size={24} color={C.t1} />
            </TouchableOpacity>
        </View>
      )}

      <View style={s.content}>
        <View style={s.iconContainer}>
          <MaterialIcons name="language" size={80} color={C.primary} />
        </View>

        <Text style={s.title}>Choose Language</Text>
        <Text style={s.subtitle}>Please select your preferred language for the app interface.</Text>

        <FlatList
          data={LANGUAGES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.langCard, selected === item.id && s.langCardActive]}
              onPress={() => handleSelect(item.id)}
            >
              <View style={s.radioCircle}>
                {selected === item.id && <View style={s.radioDot} />}
              </View>
              <View style={s.langTextContainer}>
                <Text style={[s.langNative, selected === item.id && s.langTextActive]}>{item.native}</Text>
                <Text style={[s.langEng, selected === item.id && s.langTextActive]}>{item.name}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
        
        <TouchableOpacity style={s.btn} onPress={handleContinue}>
          <Text style={s.btnTxt}>{isFirstLaunch ? 'Continue' : 'Save Preference'}</Text>
          <MaterialIcons name="arrow-forward" size={20} color={C.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 10 },
  content: { flex: 1, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 40 },
  iconContainer: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '800', color: C.t1, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: C.tMuted, textAlign: 'center', marginBottom: 32, paddingHorizontal: 20 },
  listContainer: { paddingBottom: 24, gap: 12 },
  langCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: C.card, borderRadius: 12, borderWidth: 2, borderColor: C.border },
  langCardActive: { borderColor: C.primary, backgroundColor: C.primary + '10' },
  radioCircle: { height: 24, width: 24, borderRadius: 12, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  radioDot: { height: 12, width: 12, borderRadius: 6, backgroundColor: C.primary },
  langTextContainer: { flex: 1 },
  langNative: { fontSize: 18, fontWeight: '700', color: C.t1, marginBottom: 2 },
  langEng: { fontSize: 12, color: C.tMuted },
  langTextActive: { color: C.primary },
  btn: { flexDirection: 'row', backgroundColor: C.primary, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 'auto' },
  btnTxt: { color: C.white, fontSize: 16, fontWeight: '700' },
});
