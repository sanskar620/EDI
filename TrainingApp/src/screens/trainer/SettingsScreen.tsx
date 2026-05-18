import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';

export default function SettingsScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user, logout } = useAuthStore();
  const { toggleTheme, isDark } = useThemeStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Settings</Text>
      </View>

      <View style={s.section}>
        <TouchableOpacity style={s.item} onPress={() => navigation.navigate('Profile')}>
          <MaterialIcons name="person" size={22} color={C.primary} />
          <View style={{ flex: 1 }}>
            <Text style={s.itemTitle}>Profile</Text>
            <Text style={s.itemSub}>{user?.full_name} • {user?.role}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={C.tMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={s.item} onPress={toggleTheme}>
          <MaterialIcons name={isDark ? 'dark-mode' : 'light-mode'} size={22} color={C.warning} />
          <View style={{ flex: 1 }}>
            <Text style={s.itemTitle}>Dark Mode</Text>
            <Text style={s.itemSub}>{isDark ? 'On' : 'Off'}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={C.tMuted} />
        </TouchableOpacity>

        <View style={s.item}>
          <MaterialIcons name="devices" size={22} color={C.tMuted} />
          <View style={{ flex: 1 }}>
            <Text style={s.itemTitle}>Device</Text>
            <Text style={s.itemSub}>{user?.device_model || 'Not bound'}</Text>
          </View>
        </View>

        <View style={s.item}>
          <MaterialIcons name="info" size={22} color={C.tMuted} />
          <View style={{ flex: 1 }}>
            <Text style={s.itemTitle}>App Version</Text>
            <Text style={s.itemSub}>1.0.0</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <MaterialIcons name="logout" size={20} color={C.error} />
        <Text style={s.logoutTxt}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.t1 },
  section: { marginHorizontal: 16, marginTop: 16, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  itemTitle: { fontSize: 15, fontWeight: '600', color: C.t1 },
  itemSub: { fontSize: 12, color: C.tMuted, marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 24, paddingVertical: 14, backgroundColor: C.error + '15', borderRadius: 12, borderWidth: 1, borderColor: C.error + '33' },
  logoutTxt: { color: C.error, fontSize: 15, fontWeight: '700' },
});
