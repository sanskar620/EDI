import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import authService from '../../services/authService';
import * as Device from 'expo-device';

export default function FaceVerificationScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { tempEmployeeId, requiresFaceVerification, requiresDeviceBinding, login } = useAuthStore();

  const [step, setStep] = useState(requiresFaceVerification ? 'intro' : 'device_binding');
  const [isProcessing, setIsProcessing] = useState(false);

  // We are skipping actual physical camera implementation here and making a mock successful UI
  // because facial recognition requires native modules (Expo Camera + MLKit)
  const handleFacialScan = () => {
    setStep('scanning');
    
    // Simulate real scanning process
    setTimeout(() => {
      setStep('success_face');
      setTimeout(() => {
        if (requiresDeviceBinding) {
          setStep('device_binding');
        } else {
          finishLogin();
        }
      }, 1500);
    }, 2000);
  };

  const handleDeviceBinding = async () => {
    setIsProcessing(true);
    // Simulate device check mapping
    setTimeout(() => {
      setIsProcessing(false);
      setStep('success_device');
      setTimeout(() => {
        finishLogin();
      }, 1500);
    }, 1500);
  };

  const finishLogin = async () => {
    setIsProcessing(true);
    
    // Finalizing session and creating JWTS
    const deviceId = Device.osBuildId || Device.osInternalBuildId || 'unknown_device_id';
    const deviceModel = Device.modelName || 'Unknown Device';
    
    const result = await login(tempEmployeeId, deviceId, deviceModel);
    setIsProcessing(false);
    
    if (result.success) {
      // Get current user to retrieve role
      const currentUser = await authService.getCurrentUser();
      
      if (currentUser?.role) {
        // Navigate to Main screen with role parameter
        navigation.replace('Main', { role: currentUser.role });
      } else {
        Alert.alert('Error', 'User role not found. Please try logging in again.');
        navigation.replace('Login');
      }
    } else {
      Alert.alert('Login Failed', result.error || 'Failed to complete login process');
      navigation.replace('Login');
    }
  };

  return (
    <View style={s.root}>
      {/* Intro Step */}
      {step === 'intro' && (
        <View style={s.content}>
          <MaterialIcons name="face" size={80} color={C.primary} style={s.icon} />
          <Text style={s.title}>Face Verification Required</Text>
          <Text style={s.subtitle}>For security purposes, we require facial verification to confirm your identity before logging in.</Text>
          
          <View style={s.card}>
            <View style={s.reqRow}>
              <MaterialIcons name="check-circle" size={20} color={C.success} />
              <Text style={s.reqTxt}>Ensure good lighting</Text>
            </View>
            <View style={s.reqRow}>
              <MaterialIcons name="check-circle" size={20} color={C.success} />
              <Text style={s.reqTxt}>Remove mask or sunglasses</Text>
            </View>
            <View style={s.reqRow}>
              <MaterialIcons name="check-circle" size={20} color={C.success} />
              <Text style={s.reqTxt}>Keep your phone at eye level</Text>
            </View>
          </View>

          <TouchableOpacity style={s.btnPrimary} onPress={handleFacialScan}>
            <MaterialIcons name="camera-alt" size={20} color={C.white} />
            <Text style={s.btnTxt}>Start Verification</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Scanning Step */}
      {step === 'scanning' && (
        <View style={s.content}>
          <View style={s.cameraFrame}>
            {/* Box Placeholder for Camera View */}
            <View style={s.scannerBox}>
              <View style={[s.corner, s.tl]} />
              <View style={[s.corner, s.tr]} />
              <View style={[s.corner, s.bl]} />
              <View style={[s.corner, s.br]} />
              <MaterialIcons name="face-retouching-natural" size={100} color={C.primary} style={{ opacity: 0.5 }} />
            </View>
          </View>
          <Text style={s.title}>Analyzing Face...</Text>
          <Text style={s.subtitle}>Please do not move the device</Text>
        </View>
      )}

      {/* Success Face */}
      {step === 'success_face' && (
        <View style={s.content}>
          <View style={s.iconCircleSuccess}>
            <MaterialIcons name="check" size={60} color={C.success} />
          </View>
          <Text style={s.title}>Identity Verified</Text>
          <Text style={s.subtitle}>Your face scan matches our records.</Text>
        </View>
      )}

      {/* Device Binding Step */}
      {step === 'device_binding' && (
        <View style={s.content}>
          <MaterialIcons name="phonelink-lock" size={80} color={C.primary} style={s.icon} />
          <Text style={s.title}>New Device Detected</Text>
          <Text style={s.subtitle}>It looks like you are logging in from a new device. We need to secure this device with your profile.</Text>
          
          <TouchableOpacity style={s.btnPrimary} onPress={handleDeviceBinding} disabled={isProcessing}>
            {isProcessing ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <MaterialIcons name="security" size={20} color={C.white} />
                <Text style={s.btnTxt}>Secure Device & Proceed</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Success Device */}
      {step === 'success_device' && (
        <View style={s.content}>
          <View style={s.iconCircleSuccess}>
            <MaterialIcons name="check" size={60} color={C.success} />
          </View>
          <Text style={s.title}>Device Secured</Text>
          <Text style={s.subtitle}>Logging you in...</Text>
        </View>
      )}
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, justifyContent: 'center' },
  content: { padding: 32, alignItems: 'center' },
  icon: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: C.t1, textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 14, color: C.tMuted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 16, width: '100%', marginBottom: 32, gap: 12, borderWidth: 1, borderColor: C.border },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reqTxt: { fontSize: 14, color: C.t1 },
  btnPrimary: { width: '100%', backgroundColor: C.primary, height: 54, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnTxt: { color: C.white, fontSize: 16, fontWeight: '700' },
  cameraFrame: { width: 280, height: 350, backgroundColor: C.card, borderRadius: 20, marginBottom: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  scannerBox: { width: 200, height: 250, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: C.primary },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 },
  iconCircleSuccess: { width: 100, height: 100, borderRadius: 50, backgroundColor: C.success + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
});
