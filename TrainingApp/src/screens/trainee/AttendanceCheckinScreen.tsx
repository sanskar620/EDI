import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useAttendanceStore } from '../../stores/attendanceStore';

export default function AttendanceCheckinScreen({ navigation, route }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user } = useAuthStore();
  const { currentLocation, isLoading, getCurrentLocation, markAttendance, validateGeofence } = useAttendanceStore();

  const sessionId = route?.params?.sessionId;
  const session = route?.params?.session;
  const geofence = route?.params?.geofence; // { latitude, longitude, radius }

  const [step, setStep] = useState<'choose' | 'location' | 'verifying' | 'success' | 'error'>('choose');
  const [errorMessage, setErrorMessage] = useState('');

  // Handle GPS-based check-in
  const handleGpsCheckin = async () => {
    if (!user?.id || !sessionId) {
      Alert.alert('Error', 'Session information is missing');
      return;
    }

    setStep('verifying');

    // Step 1: Get location
    const locationOk = await getCurrentLocation();
    if (!locationOk) {
      setStep('error');
      setErrorMessage('Unable to determine your location. Please enable GPS.');
      return;
    }

    // Step 2: Validate geofence if provided
    if (geofence && currentLocation) {
      const validation = await validateGeofence(
        { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
        geofence
      );
      if (!validation.valid) {
        setStep('error');
        setErrorMessage(`You are ${Math.round(validation.distance)}m away from the venue. Must be within ${geofence.radius}m.`);
        return;
      }
    }

    // Step 3: Mark attendance
    const success = await markAttendance(sessionId, user.id, user.id, {
      geofence,
      notes: 'GPS self check-in',
    });

    if (success) {
      setStep('success');
    } else {
      setStep('error');
      setErrorMessage('Failed to mark attendance. You may have already checked in.');
    }
  };

  // Navigate to Face Capture screen for face verification
  const handleFaceCheckin = () => {
    navigation.navigate('FaceCapture', {
      mode: 'attendance',
      sessionId: sessionId,
    });
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mark Attendance</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.content}>
        {step === 'choose' && (
          <>
            <View style={s.iconCircle}>
              <MaterialIcons name="how-to-reg" size={64} color={C.primary} />
            </View>
            <Text style={s.title}>Choose Check-in Method</Text>
            <Text style={s.subtitle}>
              {session?.title || 'Training Session'}
            </Text>
            
            {/* Face Verification Option - Recommended */}
            <TouchableOpacity style={s.faceBtn} onPress={handleFaceCheckin}>
              <View style={s.optionIcon}>
                <MaterialIcons name="face" size={32} color={C.white} />
              </View>
              <View style={s.optionContent}>
                <Text style={s.optionTitle}>📸 Face Verification</Text>
                <Text style={s.optionDesc}>Take a selfie to verify your identity</Text>
                <View style={s.recommendedBadge}>
                  <Text style={s.recommendedTxt}>RECOMMENDED</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={C.white} />
            </TouchableOpacity>

            {/* GPS Location Option */}
            <TouchableOpacity style={s.gpsBtn} onPress={handleGpsCheckin} disabled={isLoading}>
              <View style={[s.optionIcon, { backgroundColor: C.card }]}>
                <MaterialIcons name="location-on" size={32} color={C.primary} />
              </View>
              <View style={s.optionContent}>
                <Text style={[s.optionTitle, { color: C.t1 }]}>📍 GPS Location</Text>
                <Text style={s.optionDesc}>Verify using your current location</Text>
              </View>
              {isLoading ? (
                <ActivityIndicator color={C.primary} />
              ) : (
                <MaterialIcons name="chevron-right" size={24} color={C.tMuted} />
              )}
            </TouchableOpacity>

            {currentLocation && (
              <View style={s.locationCard}>
                <MaterialIcons name="my-location" size={16} color={C.success} />
                <Text style={s.locationTxt}>
                  {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                </Text>
              </View>
            )}
            
            <TouchableOpacity style={s.getLocBtn} onPress={getCurrentLocation}>
              <Text style={s.getLocBtnTxt}>📡 Refresh Location</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'verifying' && (
          <>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={s.title}>Verifying...</Text>
            <Text style={s.subtitle}>Please wait while we verify your location.</Text>
          </>
        )}

        {step === 'success' && (
          <>
            <View style={[s.iconCircle, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
              <MaterialIcons name="check-circle" size={64} color={C.success} />
            </View>
            <Text style={[s.title, { color: C.success }]}>Checked In! ✅</Text>
            <Text style={s.subtitle}>Your attendance has been recorded.</Text>
            <TouchableOpacity style={s.doneBtn} onPress={() => navigation.goBack()}>
              <Text style={s.doneBtnTxt}>Done</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'error' && (
          <>
            <View style={[s.iconCircle, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
              <MaterialIcons name="error" size={64} color={C.error} />
            </View>
            <Text style={[s.title, { color: C.error }]}>Check-In Failed</Text>
            <Text style={s.subtitle}>{errorMessage}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={() => { setStep('choose'); setErrorMessage(''); }}>
              <Text style={s.retryBtnTxt}>Try Again</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: C.primary + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: C.t1, textAlign: 'center' },
  subtitle: { fontSize: 14, color: C.tMuted, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  
  // Face verification button (primary)
  faceBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, borderRadius: 16, padding: 16, width: '100%', gap: 12 },
  
  // GPS button (secondary)
  gpsBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 16, padding: 16, width: '100%', gap: 12, borderWidth: 1, borderColor: C.border },
  
  optionIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  optionContent: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '700', color: C.white },
  optionDesc: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  recommendedBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 6 },
  recommendedTxt: { fontSize: 9, fontWeight: '800', color: C.white, letterSpacing: 0.5 },
  
  locationCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 10, marginTop: 8 },
  locationTxt: { fontSize: 11, color: C.tMuted },
  getLocBtn: { paddingVertical: 8 },
  getLocBtnTxt: { color: C.primary, fontSize: 13, fontWeight: '600' },
  
  doneBtn: { backgroundColor: C.success, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 },
  doneBtnTxt: { color: C.white, fontSize: 16, fontWeight: '700' },
  retryBtn: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 },
  retryBtnTxt: { color: C.t1, fontSize: 16, fontWeight: '700' },
});
