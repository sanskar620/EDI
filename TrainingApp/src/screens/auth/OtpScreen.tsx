import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';

export default function OtpScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputs = useRef<Array<TextInput | null>>([]);
  const { tempEmployeeId, tempMobileNumber, verifyOTP, sendOTP, isLoading } = useAuthStore();
  const [countdown, setCountdown] = useState(30);

  // OTP is already sent from LoginScreen, no need to send again here

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit OTP.');
      return;
    }

    if (!tempEmployeeId) {
      Alert.alert('Error', 'Missing session information. Please restart login.');
      navigation.goBack();
      return;
    }

    const result = await verifyOTP(tempEmployeeId, otpCode);
    
    if (result.success) {
      // Logic for device binding or face verification should go here
      // For now we go directly to login finish flow, but the face verification
      // would intercept here if requiresFaceVerification is true
      navigation.navigate('FaceVerification');
    } else {
      Alert.alert('Verification Failed', result.error || 'Invalid OTP.');
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setCountdown(30);
    setOtp(['', '', '', '', '', '']);
    inputs.current[0]?.focus();
    
    if (tempEmployeeId && tempMobileNumber) {
        const result = await sendOTP(tempEmployeeId, tempMobileNumber);
        if (!result.success) {
            Alert.alert('Error', result.error || 'Failed to send OTP');
        } else {
            Alert.alert('Success', 'OTP resent successfully');
        }
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scrollContainer}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={C.t1} />
          </TouchableOpacity>
        </View>

        <View style={s.iconContainer}>
          <MaterialIcons name="message" size={64} color={C.primary} />
        </View>

        <Text style={s.title}>Verification Code</Text>
        <Text style={s.subtitle}>
          We have sent a verification code to your mobile number.
        </Text>

        <View style={s.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref: any) => (inputs.current[index] = ref)}
              style={s.otpInput}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity style={s.btn} onPress={handleVerify} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={s.btnTxt}>Verify OTP</Text>
          )}
        </TouchableOpacity>

        <View style={s.resendContainer}>
          <Text style={s.resendTxt}>Didn't receive the code? </Text>
          <TouchableOpacity onPress={handleResend} disabled={countdown > 0}>
            <Text style={[s.linkTxt, countdown > 0 && s.linkTxtDisabled]}>
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scrollContainer: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 40 },
  header: { marginBottom: 30 },
  iconContainer: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '800', color: C.t1, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: C.tMuted, textAlign: 'center', marginBottom: 32, paddingHorizontal: 20 },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  otpInput: { width: 45, height: 50, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, fontSize: 24, fontWeight: '700', color: C.t1, textAlign: 'center' },
  btn: { backgroundColor: C.primary, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: C.white, fontSize: 16, fontWeight: '700' },
  resendContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  resendTxt: { fontSize: 14, color: C.tMuted },
  linkTxt: { fontSize: 14, fontWeight: '700', color: C.primary },
  linkTxtDisabled: { color: C.tMuted },
});
