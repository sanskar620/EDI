import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../config/supabase';

export default function RegisterScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { createUser, isLoading } = useAuthStore();
  const [form, setForm] = useState({
    employee_id: '',
    full_name: '',
    email: '',
    mobile_number: '',
    department: '',
    designation: '',
    role: 'TRAINEE' as UserRole,
  });

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    if (!form.employee_id || !form.full_name || !form.mobile_number) {
      Alert.alert('Error', 'Please fill all required fields: Employee ID, Full Name, and Mobile Number.');
      return;
    }

    const success = await createUser(form);
    if (success) {
      Alert.alert('Success', 'User generated successfully. Please Ask the user to login via OTP now', [
        { text: 'Login now', onPress: () => navigation.navigate('Login') }
      ]);
    } else {
      Alert.alert('Registration Failed', 'Failed to create user. Please try again or contact administrator.');
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <MaterialIcons name="arrow-back" size={24} color={C.t1} />
            </TouchableOpacity>
        </View>

        <Text style={s.title}>Create Account</Text>
        <Text style={s.subtitle}>Register new user in the MediAgent System</Text>

        <View style={s.form}>
          <Text style={s.label}>Employee ID *</Text>
          <TextInput style={s.input} placeholder="EMP123" placeholderTextColor={C.tMuted} autoCapitalize="characters" value={form.employee_id} onChangeText={v => updateField('employee_id', v)} />

          <Text style={s.label}>Full Name *</Text>
          <TextInput style={s.input} placeholder="John Doe" placeholderTextColor={C.tMuted} value={form.full_name} onChangeText={v => updateField('full_name', v)} />

          <Text style={s.label}>Mobile Number *</Text>
          <TextInput style={s.input} placeholder="+1234567890" placeholderTextColor={C.tMuted} keyboardType="phone-pad" value={form.mobile_number} onChangeText={v => updateField('mobile_number', v)} />

          <Text style={s.label}>Email Address</Text>
          <TextInput style={s.input} placeholder="john@example.com" placeholderTextColor={C.tMuted} keyboardType="email-address" value={form.email} onChangeText={v => updateField('email', v)} />

          <Text style={s.label}>Department</Text>
          <TextInput style={s.input} placeholder="e.g. Sales" placeholderTextColor={C.tMuted} value={form.department} onChangeText={v => updateField('department', v)} />

          <Text style={s.label}>Designation</Text>
          <TextInput style={s.input} placeholder="e.g. Trainee" placeholderTextColor={C.tMuted} value={form.designation} onChangeText={v => updateField('designation', v)} />

          <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color={C.white} /> : <Text style={s.btnTxt}>Sign Up</Text>}
          </TouchableOpacity>
        </View>
        
        <View style={s.footer}>
          <Text style={s.footerTxt}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={s.linkTxt}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scrollContainer: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 40 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', color: C.t1, marginBottom: 8 },
  subtitle: { fontSize: 14, color: C.tMuted, marginBottom: 32 },
  form: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: C.tMuted, marginTop: 12, marginBottom: 8 },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, color: C.t1 },
  btn: { backgroundColor: C.primary, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  btnTxt: { color: C.white, fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerTxt: { fontSize: 14, color: C.tMuted },
  linkTxt: { fontSize: 14, fontWeight: '700', color: C.primary },
});
