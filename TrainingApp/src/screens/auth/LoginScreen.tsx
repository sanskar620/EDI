import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';

type RoleType = 'TRAINEE' | 'TRAINER' | 'SUPERVISOR';

export default function LoginScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const [employeeId, setEmployeeId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleType>('TRAINEE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { verifyIdentity, sendOTP, setTempCredentials } = useAuthStore();

  const roles: { key: RoleType; label: string; icon: any }[] = [
    { key: 'TRAINEE', label: 'Trainee', icon: 'school' },
    { key: 'TRAINER', label: 'Trainer', icon: 'person' },
    { key: 'SUPERVISOR', label: 'Supervisor', icon: 'admin-panel-settings' },
  ];

  const handleLogin = async () => {
    console.log('[LoginScreen] handleLogin called');
    console.log('[LoginScreen] Employee ID:', employeeId.trim());
    console.log('[LoginScreen] Mobile:', mobileNumber.trim());
    console.log('[LoginScreen] Selected Role:', selectedRole);
    
    if (!employeeId.trim() || !mobileNumber.trim()) {
      Alert.alert('Error', 'Please enter your Employee ID and Mobile Number.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepend +91 if not already present for OTP sending
      const fullMobile = mobileNumber.trim().startsWith('+91') 
        ? mobileNumber.trim() 
        : `+91${mobileNumber.trim()}`;
      
      // Step 1: Verify identity with HR Master data
      console.log('[LoginScreen] Step 1: Verifying identity...');
      const result = await verifyIdentity(employeeId.trim(), fullMobile);
      
      if (result.success) {
        // Check if user's role matches selected role (only if role is returned)
        const userRole = result.data?.role;
        if (userRole && userRole !== selectedRole) {
          setIsSubmitting(false);
          Alert.alert('Role Mismatch', `Your account is registered as ${userRole}. Please select the correct role.`);
          return;
        }
        
        // Save credentials for OTP screen
        console.log('[LoginScreen] Setting temp credentials...');
        setTempCredentials(
          employeeId.trim(), 
          fullMobile, 
          result.data?.full_name || ''
        );
        
        // Step 2: Send OTP
        console.log('[LoginScreen] Step 2: Sending OTP...');
        const otpResult = await sendOTP(employeeId.trim(), fullMobile);
        console.log('[LoginScreen] Send OTP result:', JSON.stringify(otpResult));
        
        if (otpResult.success) {
          // Navigate to OTP screen
          console.log('[LoginScreen] Navigating to OTP screen...');
          setIsSubmitting(false);
          navigation.navigate('Otp');
        } else {
          setIsSubmitting(false);
          Alert.alert('Error', otpResult.error || 'Failed to send OTP. Please try again.');
        }
      } else {
        setIsSubmitting(false);
        Alert.alert('Login Failed', result.error || 'Invalid credentials. Please check your Employee ID and Mobile Number.');
      }
    } catch (error: any) {
      console.log('[LoginScreen] Error:', error);
      setIsSubmitting(false);
      Alert.alert('Error', error.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={s.logoContainer}>
          <View style={s.logoCircle}>
            <MaterialIcons name="school" size={48} color={C.white} />
          </View>
        </View>

        <Text style={s.title}>Training Portal</Text>
        <Text style={s.subtitle}>Select your role and sign in securely.</Text>

        {/* Role Selection */}
        <View style={s.roleContainer}>
          {roles.map((role) => (
            <TouchableOpacity
              key={role.key}
              style={[s.roleBtn, selectedRole === role.key && s.roleBtnActive]}
              onPress={() => setSelectedRole(role.key)}
            >
              <MaterialIcons 
                name={role.icon} 
                size={24} 
                color={selectedRole === role.key ? C.white : C.tMuted} 
              />
              <Text style={[s.roleTxt, selectedRole === role.key && s.roleTxtActive]}>
                {role.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.form}>
          <Text style={s.label}>Employee ID</Text>
          <View style={s.inputWrapper}>
            <MaterialIcons name="badge" size={20} color={C.tMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="e.g. EMP001"
              placeholderTextColor={C.tMuted}
              value={employeeId}
              onChangeText={setEmployeeId}
              autoCapitalize="characters"
            />
          </View>

          <Text style={s.label}>Mobile Number</Text>
          <View style={s.inputWrapper}>
            <MaterialIcons name="phone" size={20} color={C.tMuted} style={s.inputIcon} />
            <View style={s.countryCode}>
              <Text style={s.countryCodeTxt}>+91</Text>
            </View>
            <TextInput
              style={s.input}
              placeholder="e.g. 9822079201"
              placeholderTextColor={C.tMuted}
              value={mobileNumber}
              onChangeText={setMobileNumber}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={s.btnTxt}>Verify & Continue</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Text style={s.footerTxt}>Need help? Contact your administrator</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 24 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: C.t1, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: C.tMuted, textAlign: 'center', marginBottom: 24 },
  roleContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 8 },
  roleBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, backgroundColor: C.card, borderRadius: 12, borderWidth: 2, borderColor: C.border },
  roleBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  roleTxt: { fontSize: 12, fontWeight: '600', color: C.tMuted, marginTop: 6 },
  roleTxtActive: { color: C.white },
  form: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: C.tMuted, marginTop: 12, marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14 },
  inputIcon: { marginRight: 10 },
  countryCode: { backgroundColor: C.bg, borderRightWidth: 1, borderRightColor: C.border, paddingRight: 10, marginRight: 10, height: 48, justifyContent: 'center' },
  countryCodeTxt: { fontSize: 15, fontWeight: '700', color: C.t1 },
  input: { flex: 1, height: 48, fontSize: 15, color: C.t1 },
  btn: { backgroundColor: C.primary, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  btnTxt: { color: C.white, fontSize: 16, fontWeight: '700' },
  footer: { alignItems: 'center', marginTop: 32 },
  footerTxt: { fontSize: 14, color: C.tMuted },
});
