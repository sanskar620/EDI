import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';

export default function ProfileScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user, isLoading, updateProfile, logout } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    department: user?.department || '',
    designation: user?.designation || '',
  });

  const handleSave = async () => {
    const success = await updateProfile({
      full_name: form.full_name,
      email: form.email,
      department: form.department,
      designation: form.designation,
    });
    if (success) {
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } else {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => isEditing ? handleSave() : setIsEditing(true)}>
          <Text style={s.editTxt}>{isEditing ? 'Save' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Avatar */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{(user?.full_name || 'U').charAt(0)}</Text>
          </View>
          <Text style={s.nameDisplay}>{user?.full_name || 'User'}</Text>
          <View style={s.roleBadge}>
            <Text style={s.roleTxt}>{user?.role || 'TRAINEE'}</Text>
          </View>
        </View>

        {isLoading && <ActivityIndicator color={C.primary} style={{ marginVertical: 12 }} />}

        {/* Info Card */}
        <View style={s.card}>
          <View style={s.fieldRow}>
            <MaterialIcons name="badge" size={20} color={C.tMuted} />
            <View style={s.fieldContent}>
              <Text style={s.fieldLabel}>Employee ID</Text>
              <Text style={s.fieldValue}>{user?.employee_id || '-'}</Text>
            </View>
          </View>

          <View style={s.fieldRow}>
            <MaterialIcons name="phone" size={20} color={C.tMuted} />
            <View style={s.fieldContent}>
              <Text style={s.fieldLabel}>Mobile</Text>
              <Text style={s.fieldValue}>{user?.mobile_number || '-'}</Text>
            </View>
          </View>

          <View style={s.fieldRow}>
            <MaterialIcons name="person" size={20} color={C.tMuted} />
            <View style={s.fieldContent}>
              <Text style={s.fieldLabel}>Full Name</Text>
              {isEditing ? (
                <TextInput style={s.fieldInput} value={form.full_name} onChangeText={(v) => setForm((p) => ({ ...p, full_name: v }))} />
              ) : (
                <Text style={s.fieldValue}>{user?.full_name || '-'}</Text>
              )}
            </View>
          </View>

          <View style={s.fieldRow}>
            <MaterialIcons name="email" size={20} color={C.tMuted} />
            <View style={s.fieldContent}>
              <Text style={s.fieldLabel}>Email</Text>
              {isEditing ? (
                <TextInput style={s.fieldInput} value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} keyboardType="email-address" />
              ) : (
                <Text style={s.fieldValue}>{user?.email || '-'}</Text>
              )}
            </View>
          </View>

          <View style={s.fieldRow}>
            <MaterialIcons name="business" size={20} color={C.tMuted} />
            <View style={s.fieldContent}>
              <Text style={s.fieldLabel}>Department</Text>
              {isEditing ? (
                <TextInput style={s.fieldInput} value={form.department} onChangeText={(v) => setForm((p) => ({ ...p, department: v }))} />
              ) : (
                <Text style={s.fieldValue}>{user?.department || '-'}</Text>
              )}
            </View>
          </View>

          <View style={s.fieldRow}>
            <MaterialIcons name="work" size={20} color={C.tMuted} />
            <View style={s.fieldContent}>
              <Text style={s.fieldLabel}>Designation</Text>
              {isEditing ? (
                <TextInput style={s.fieldInput} value={form.designation} onChangeText={(v) => setForm((p) => ({ ...p, designation: v }))} />
              ) : (
                <Text style={s.fieldValue}>{user?.designation || '-'}</Text>
              )}
            </View>
          </View>

          <View style={s.fieldRow}>
            <MaterialIcons name="devices" size={20} color={C.tMuted} />
            <View style={s.fieldContent}>
              <Text style={s.fieldLabel}>Device</Text>
              <Text style={s.fieldValue}>{user?.device_model || 'Not bound'}</Text>
            </View>
          </View>

          <View style={s.fieldRow}>
            <MaterialIcons name="access-time" size={20} color={C.tMuted} />
            <View style={s.fieldContent}>
              <Text style={s.fieldLabel}>Last Login</Text>
              <Text style={s.fieldValue}>
                {user?.last_login_at ? new Date(user.last_login_at).toLocaleString() : '-'}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Actions */}
        <View style={{ marginTop: 24, paddingHorizontal: 16, gap: 12 }}>
          <TouchableOpacity 
            style={s.actionBtn} 
            onPress={() => navigation.navigate('Certificates')}
          >
            <View style={[s.actionIcon, { backgroundColor: '#a855f722' }]}>
              <MaterialIcons name="workspace-premium" size={20} color="#a855f7" />
            </View>
            <Text style={s.actionTxt}>My Certificates</Text>
            <MaterialIcons name="chevron-right" size={20} color={C.tMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color={C.error} />
          <Text style={s.logoutTxt}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  editTxt: { fontSize: 14, fontWeight: '700', color: C.primary },
  avatarSection: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: C.white, fontSize: 32, fontWeight: '700' },
  nameDisplay: { fontSize: 20, fontWeight: '800', color: C.t1 },
  roleBadge: { backgroundColor: C.primary + '22', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12 },
  roleTxt: { color: C.primary, fontSize: 12, fontWeight: '700' },
  card: { marginHorizontal: 16, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, gap: 16 },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  fieldContent: { flex: 1 },
  fieldLabel: { fontSize: 11, color: C.tMuted, marginBottom: 2 },
  fieldValue: { fontSize: 15, color: C.t1, fontWeight: '500' },
  fieldInput: { fontSize: 15, color: C.t1, fontWeight: '500', borderBottomWidth: 1, borderBottomColor: C.primary, paddingBottom: 4 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 24, paddingVertical: 14, backgroundColor: C.error + '15', borderRadius: 12, borderWidth: 1, borderColor: C.error + '33' },
  logoutTxt: { color: C.error, fontSize: 15, fontWeight: '700' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, gap: 14 },
  actionIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionTxt: { flex: 1, fontSize: 15, fontWeight: '700', color: C.t1 },
});
