import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../config/supabase';
import authService from '../../services/authService';

export default function CreateTraineeScreen({ navigation }: any) {
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
    if (form.mobile_number.replace(/\D/g, '').length < 10) return 'Valid mobile number is required';
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
        department: form.department.trim() || 'Operations',
        designation: form.designation.trim() || 'Trainee',
      });

      if (!hrResult.success) {
        Alert.alert('Error', hrResult.error || 'Failed to create HR record');
        setIsLoading(false);
        return;
      }

      // Then create user record with TRAINEE role
      const userResult = await authService.createUserWithRole({
        employee_id: form.employee_id.trim().toUpperCase(),
        full_name: form.full_name.trim(),
        mobile_number: formattedMobile,
        email: form.email.trim().toLowerCase(),
        role: UserRole.TRAINEE,
        department: form.department.trim() || 'Operations',
        designation: form.designation.trim() || 'Trainee',
      });

      if (userResult.success) {
        Alert.alert(
          '✅ Trainee Created!', 
          `${form.full_name} has been created successfully.\n\nEmployee ID: ${form.employee_id.toUpperCase()}\n\nThe trainee can now login using their Employee ID and mobile number. They will be prompted to register their face on first login.`,
          [
            { text: 'Create Another', onPress: () => setForm({ employee_id: '', full_name: '', mobile_number: '', email: '', department: '', designation: '' }) },
            { text: 'Done', onPress: () => navigation.goBack() },
          ]
        );
      } else {
        Alert.alert('Error', userResult.error || 'Failed to create trainee');
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
        <Text style={s.headerTitle}>Create Trainee</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.form}>
          <View style={s.infoCard}>
            <MaterialIcons name="info-outline" size={20} color={C.primary} />
            <Text style={s.infoText}>
              Create a new trainee account. The trainee will need to register their face on first login for attendance verification.
            </Text>
          </View>

          <Text style={s.label}>Employee ID *</Text>
          <TextInput 
            style={s.input} 
            placeholder="e.g. EMP010" 
            placeholderTextColor={C.tMuted} 
            value={form.employee_id} 
            onChangeText={(v) => updateField('employee_id', v.toUpperCase())} 
            autoCapitalize="characters"
          />

          <Text style={s.label}>Full Name *</Text>
          <TextInput 
            style={s.input} 
            placeholder="e.g. Rahul Kumar" 
            placeholderTextColor={C.tMuted} 
            value={form.full_name} 
            onChangeText={(v) => updateField('full_name', v)} 
          />

          <Text style={s.label}>Mobile Number *</Text>
          <View style={s.phoneInputWrapper}>
            <Text style={s.countryCode}>+91</Text>
            <TextInput 
              style={s.phoneInput} 
              placeholder="9876543210" 
              placeholderTextColor={C.tMuted} 
              value={form.mobile_number.replace('+91', '')} 
              onChangeText={(v) => updateField('mobile_number', v.replace(/\D/g, '').slice(0, 10))} 
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <Text style={s.label}>Email *</Text>
          <TextInput 
            style={s.input} 
            placeholder="trainee@company.com" 
            placeholderTextColor={C.tMuted} 
            value={form.email} 
            onChangeText={(v) => updateField('email', v)} 
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={s.label}>Department</Text>
          <TextInput 
            style={s.input} 
            placeholder="e.g. Operations" 
            placeholderTextColor={C.tMuted} 
            value={form.department} 
            onChangeText={(v) => updateField('department', v)} 
          />

          <Text style={s.label}>Designation</Text>
          <TextInput 
            style={s.input} 
            placeholder="e.g. Associate" 
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
                <Text style={s.submitBtnTxt}>Create Trainee</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={s.noteCard}>
            <MaterialIcons name="lightbulb-outline" size={18} color={C.warning} />
            <Text style={s.noteText}>
              After creation, the trainee can login using their Employee ID and mobile number. 
              On first login, they will be prompted to register their face for attendance.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingTop: 56, 
    paddingBottom: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: C.border 
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  form: { padding: 16, gap: 12 },
  infoCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    backgroundColor: C.primary + '15', 
    borderRadius: 10, 
    padding: 14, 
    marginBottom: 8 
  },
  infoText: { flex: 1, fontSize: 13, color: C.primary, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '600', color: C.t1, marginTop: 8 },
  input: { 
    backgroundColor: C.card, 
    borderWidth: 1, 
    borderColor: C.border, 
    borderRadius: 10, 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    fontSize: 15, 
    color: C.t1 
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  countryCode: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.t1,
    fontWeight: '600',
    borderRightWidth: 1,
    borderRightColor: C.border,
    backgroundColor: C.bg,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.t1,
  },
  submitBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    backgroundColor: C.primary, 
    borderRadius: 10, 
    paddingVertical: 14, 
    marginTop: 24 
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: C.warning + '15',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
  },
  noteText: { flex: 1, fontSize: 12, color: C.tMuted, lineHeight: 18 },
});
