import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../config/supabase';
import authService from '../../services/authService';

export default function CreateTrainerScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    employee_id: '',
    full_name: '',
    mobile_number: '',
    email: '',
    department: '',
    designation: '',
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!form.employee_id.trim()) return 'Employee ID is required';
    if (!form.full_name.trim()) return 'Full name is required';
    if (!form.mobile_number.trim()) return 'Mobile number is required';
    if (form.mobile_number.length < 10) return 'Valid mobile number is required';
    if (!form.email.trim()) return 'Email is required';
    if (!form.email.includes('@')) return 'Valid email is required';
    return null;
  };

  const handleCreate = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    setIsLoading(true);

    try {
      // Format mobile number with +91 prefix
      const formattedMobile = form.mobile_number.startsWith('+91') 
        ? form.mobile_number.trim() 
        : `+91${form.mobile_number.replace(/\D/g, '').slice(-10)}`;

      // First, create in hr_master_data
      const hrResult = await authService.createHrMasterRecord({
        employee_id: form.employee_id.trim().toUpperCase(),
        full_name: form.full_name.trim(),
        mobile_number: formattedMobile,
        email: form.email.trim().toLowerCase(),
        department: form.department.trim() || 'Training',
        designation: form.designation.trim() || 'Trainer',
      });

      if (!hrResult.success) {
        Alert.alert('Error', hrResult.error || 'Failed to create HR record');
        setIsLoading(false);
        return;
      }

      // Then create user record with TRAINER role
      const userResult = await authService.createUserWithRole({
        employee_id: form.employee_id.trim().toUpperCase(),
        full_name: form.full_name.trim(),
        mobile_number: formattedMobile,
        email: form.email.trim().toLowerCase(),
        role: UserRole.TRAINER,
        department: form.department.trim() || 'Training',
        designation: form.designation.trim() || 'Trainer',
      });

      if (userResult.success) {
        Alert.alert(
          '✅ Trainer Created!', 
          `${form.full_name} has been created successfully.\n\nEmployee ID: ${form.employee_id.toUpperCase()}\n\nThe trainer can now login using their Employee ID and mobile number.`,
          [
            { text: 'Create Another', onPress: () => setForm({ employee_id: '', full_name: '', mobile_number: '', email: '', department: '', designation: '' }) },
            { text: 'Done', onPress: () => navigation.goBack() },
          ]
        );
      } else {
        Alert.alert('Error', userResult.error || 'Failed to create trainer');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Create Trainer</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.form}>
          <View style={s.infoCard}>
            <MaterialIcons name="info-outline" size={20} color={C.primary} />
            <Text style={s.infoText}>Create a new trainer account. The trainer will be able to create sessions and mark attendance.</Text>
          </View>

          <Text style={s.label}>Employee ID *</Text>
          <TextInput 
            style={s.input} 
            placeholder="e.g. EMP004" 
            placeholderTextColor={C.tMuted} 
            value={form.employee_id} 
            onChangeText={(v) => updateField('employee_id', v)} 
            autoCapitalize="characters"
          />

          <Text style={s.label}>Full Name *</Text>
          <TextInput 
            style={s.input} 
            placeholder="e.g. John Doe" 
            placeholderTextColor={C.tMuted} 
            value={form.full_name} 
            onChangeText={(v) => updateField('full_name', v)} 
          />

          <Text style={s.label}>Mobile Number *</Text>
          <TextInput 
            style={s.input} 
            placeholder="+919876543210" 
            placeholderTextColor={C.tMuted} 
            value={form.mobile_number} 
            onChangeText={(v) => updateField('mobile_number', v)} 
            keyboardType="phone-pad"
          />

          <Text style={s.label}>Email *</Text>
          <TextInput 
            style={s.input} 
            placeholder="trainer@company.com" 
            placeholderTextColor={C.tMuted} 
            value={form.email} 
            onChangeText={(v) => updateField('email', v)} 
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={s.label}>Department</Text>
          <TextInput 
            style={s.input} 
            placeholder="e.g. Training" 
            placeholderTextColor={C.tMuted} 
            value={form.department} 
            onChangeText={(v) => updateField('department', v)} 
          />

          <Text style={s.label}>Designation</Text>
          <TextInput 
            style={s.input} 
            placeholder="e.g. Senior Trainer" 
            placeholderTextColor={C.tMuted} 
            value={form.designation} 
            onChangeText={(v) => updateField('designation', v)} 
          />

          <TouchableOpacity 
            style={[s.submitBtn, isLoading && s.submitBtnDisabled]} 
            onPress={handleCreate}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="person-add" size={20} color="#fff" />
                <Text style={s.submitBtnTxt}>Create Trainer</Text>
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
  form: { padding: 16, gap: 12 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.primary + '15', borderRadius: 10, padding: 14, marginBottom: 8 },
  infoText: { flex: 1, fontSize: 13, color: C.primary, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '600', color: C.t1, marginTop: 8 },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.t1 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 10, paddingVertical: 14, marginTop: 24 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
