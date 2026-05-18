import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';

const menuItems = [
  { key: 'ManageTrainers', icon: 'person-add', label: 'Manage Trainers', desc: 'Add & view trainers', color: '#3b82f6', screen: 'ManageTrainers' },
  { key: 'ManageTrainees', icon: 'groups', label: 'Manage Trainees', desc: 'Add & view trainees', color: '#10b981', screen: 'ManageTrainees' },
  { key: 'ManageCourses', icon: 'menu-book', label: 'Manage Courses', desc: 'Create & view courses', color: '#f59e0b', screen: 'ManageCourses' },
  { key: 'ManageSessions', icon: 'event', label: 'Manage Sessions', desc: 'Create & view sessions', color: '#8b5cf6', screen: 'ManageSessions' },
  { key: 'Enrollment', icon: 'how-to-reg', label: 'Enrollment', desc: 'Assign trainees & trainers', color: '#ef4444', screen: 'Enrollment' },
];

export default function SupervisorDashboard({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user, logout } = useAuthStore();

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Welcome back,</Text>
          <Text style={s.name}>{user?.full_name || 'Supervisor'}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={s.logoutBtn}>
          <MaterialIcons name="logout" size={22} color={C.error} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={s.sectionTitle}>Management Console</Text>

        <View style={s.grid}>
          {menuItems.map(item => (
            <TouchableOpacity key={item.key} style={s.card} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.7}>
              <View style={[s.iconCircle, { backgroundColor: item.color + '18' }]}>
                <MaterialIcons name={item.icon as any} size={28} color={item.color} />
              </View>
              <Text style={s.cardLabel}>{item.label}</Text>
              <Text style={s.cardDesc}>{item.desc}</Text>
              <MaterialIcons name="arrow-forward-ios" size={14} color={C.tMuted} style={{ position: 'absolute', top: 16, right: 16 }} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  greeting: { fontSize: 14, color: C.tMuted },
  name: { fontSize: 22, fontWeight: '800', color: C.t1 },
  logoutBtn: { padding: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: C.t1, marginBottom: 16 },
  grid: { gap: 12 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border, gap: 6, position: 'relative' },
  iconCircle: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  cardLabel: { fontSize: 17, fontWeight: '700', color: C.t1 },
  cardDesc: { fontSize: 13, color: C.tMuted },
});
