import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import userService from '../../services/userService';

export default function ManageTraineesScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const [tab, setTab] = useState<'list' | 'add'>('list');
  const [trainees, setTrainees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [empId, setEmpId] = useState('');
  const [mobile, setMobile] = useState('');

  useEffect(() => { fetchTrainees(); }, []);

  const fetchTrainees = async () => {
    setLoading(true);
    const res = await userService.getTrainees();
    if (res.success && res.data) setTrainees(res.data);
    setLoading(false);
  };

  const handleAddTrainee = async () => {
    if (!name.trim() || !empId.trim() || !mobile.trim()) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    setLoading(true);

    const res = await userService.createUser({
      employee_id: empId.trim(),
      full_name: name.trim(),
      mobile_number: mobile.trim(),
      role: 'TRAINEE',
      department: 'Operations',
      designation: 'Trainee',
    });

    setLoading(false);
    if (!res.success) {
      Alert.alert('Error', res.error || 'Failed to add trainee');
    } else {
      Alert.alert('✅ Success', `${name} added as Trainee`);
      setName(''); setEmpId(''); setMobile('');
      setTab('list');
      fetchTrainees();
    }
  };

  const handleDeleteTrainee = (item: any) => {
    Alert.alert(
      'Delete Trainee',
      `Are you sure you want to permanently delete "${item.full_name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const res = await userService.deleteUser(item.id);
            setLoading(false);
            if (res.success) {
              Alert.alert('Deleted', `${item.full_name} has been removed.`);
              fetchTrainees();
            } else {
              Alert.alert('Error', res.error || 'Failed to delete trainee');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Manage Trainees</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabBtn, tab === 'list' && s.tabBtnActive]} onPress={() => setTab('list')}>
          <MaterialIcons name="list" size={18} color={tab === 'list' ? '#fff' : C.tMuted} />
          <Text style={[s.tabTxt, tab === 'list' && s.tabTxtActive]}>View Trainees</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === 'add' && s.tabBtnActive]} onPress={() => setTab('add')}>
          <MaterialIcons name="person-add" size={18} color={tab === 'add' ? '#fff' : C.tMuted} />
          <Text style={[s.tabTxt, tab === 'add' && s.tabTxtActive]}>Add Trainee</Text>
        </TouchableOpacity>
      </View>

      {tab === 'list' ? (
        <FlatList
          data={trainees}
          keyExtractor={item => item.id?.toString()}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshing={loading}
          onRefresh={fetchTrainees}
          ListEmptyComponent={<Text style={s.emptyTxt}>No trainees found</Text>}
          renderItem={({ item }) => (
            <View style={s.userCard}>
              <View style={[s.avatar, { backgroundColor: '#10b98122' }]}>
                <Text style={[s.avatarTxt, { color: '#10b981' }]}>{(item.full_name || 'T').charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.userName}>{item.full_name}</Text>
                <Text style={s.userSub}>{item.employee_id} • {item.mobile_number}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: item.status === 'ACTIVE' ? '#10b98118' : '#ef444418' }]}>
                <Text style={[s.statusTxt, { color: item.status === 'ACTIVE' ? '#10b981' : '#ef4444' }]}>{item.status}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteTrainee(item)} style={{ padding: 6, marginLeft: 4 }}>
                <MaterialIcons name="delete-outline" size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <Text style={s.formTitle}>➕ Add New Trainee</Text>
          <Text style={s.label}>Full Name *</Text>
          <TextInput style={s.input} placeholder="e.g. Jane Doe" placeholderTextColor={C.tMuted} value={name} onChangeText={setName} />
          <Text style={s.label}>Employee ID *</Text>
          <TextInput style={s.input} placeholder="e.g. EMP010" placeholderTextColor={C.tMuted} value={empId} onChangeText={setEmpId} autoCapitalize="characters" />
          <Text style={s.label}>Mobile Number *</Text>
          <TextInput style={s.input} placeholder="e.g. 9876543210" placeholderTextColor={C.tMuted} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
          <TouchableOpacity style={s.saveBtn} onPress={handleAddTrainee} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <><MaterialIcons name="save" size={20} color="#fff" /><Text style={s.saveBtnTxt}>Save Trainee</Text></>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 8 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  tabBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabTxt: { fontSize: 13, fontWeight: '700', color: C.tMuted },
  tabTxtActive: { color: '#fff' },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 18, fontWeight: '800' },
  userName: { fontSize: 15, fontWeight: '700', color: C.t1 },
  userSub: { fontSize: 12, color: C.tMuted, marginTop: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusTxt: { fontSize: 10, fontWeight: '700' },
  emptyTxt: { textAlign: 'center', color: C.tMuted, fontSize: 14, marginTop: 40 },
  formTitle: { fontSize: 20, fontWeight: '800', color: C.t1 },
  label: { fontSize: 13, fontWeight: '600', color: C.tMuted, marginTop: 4 },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.t1 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, marginTop: 12 },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
