import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
// Supabase import removed

export default function CommsScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user } = useAuthStore();
  const { notifications, isLoading, fetchNotifications, markAsRead, markAllAsRead, deleteNotification } = useNotificationStore();

  const [supervisorNotifs, setSupervisorNotifs] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id);
    }
  }, [user?.id, user?.role]);

  const displayNotifications = [...supervisorNotifs, ...notifications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleMarkAllRead = async () => {
    if (user?.id) await markAllAsRead(user.id);
  };

  const handleNotificationPress = (notif: any) => {
    if (typeof notif.id === 'number') {
      markAsRead(notif.id);
    }
    
    // Navigate based on type
    if (['TRAINING_INVITE', 'REMINDER_24H', 'REMINDER_1H', 'MATERIAL_RELEASED', 'ASSESSMENT_DUE', 'RESULT_PUBLISHED'].includes(notif.notification_type)) {
      if (notif.session_id) {
        navigation.navigate('SessionDetails', { sessionId: notif.session_id });
        return;
      }
    }
    
    // Fallback: Show alert
    Alert.alert(notif.title, notif.message);
  };

  const getIconForType = (type: string): any => {
    switch (type) {
      case 'TRAINING_INVITE': return 'event';
      case 'REMINDER_24H': return 'alarm';
      case 'MATERIAL_RELEASED': return 'upload-file';
      case 'SESSION_CANCELLED': return 'cancel';
      case 'ASSESSMENT_DUE': return 'quiz';
      case 'RESULT_PUBLISHED': return 'grade';
      default: return 'notifications';
    }
  };

  const getColorForType = (type: string): string => {
    switch (type) {
      case 'TRAINING_INVITE': return '#3b82f6';
      case 'REMINDER_24H': return '#f59e0b';
      case 'MATERIAL_RELEASED': return '#10b981';
      case 'SESSION_CANCELLED': return '#ef4444';
      case 'ASSESSMENT_DUE': return '#a855f7';
      case 'RESULT_PUBLISHED': return '#06b6d4';
      default: return '#94a3b8';
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllRead}>
          <Text style={s.markAllTxt}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
        ) : displayNotifications.length === 0 ? (
          <View style={s.emptyCard}>
            <MaterialIcons name="notifications-none" size={48} color={C.tMuted} />
            <Text style={s.emptyTitle}>No notifications</Text>
            <Text style={s.emptyText}>You're all caught up!</Text>
          </View>
        ) : (
          <View style={s.list}>
            {displayNotifications.map((notif: any) => (
              <TouchableOpacity
                key={notif.id}
                style={[s.card, !notif.is_read && s.cardUnread]}
                onPress={() => handleNotificationPress(notif)}
              >
                <View style={[s.iconWrap, { backgroundColor: getColorForType(notif.notification_type) + '22' }]}>
                  <MaterialIcons name={getIconForType(notif.notification_type)} size={24} color={getColorForType(notif.notification_type)} />
                </View>
                <View style={s.content}>
                  <Text style={s.cardTitle} numberOfLines={1}>{notif.title}</Text>
                  <Text style={s.cardMsg} numberOfLines={2}>{notif.message}</Text>
                  <Text style={s.cardTime}>{formatTime(notif.created_at)}</Text>
                </View>
                {!notif.is_read && <View style={s.unreadDot} />}
                <TouchableOpacity onPress={() => deleteNotification(notif.id)} style={s.deleteBtn}>
                  <MaterialIcons name="close" size={16} color={C.tMuted} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.t1 },
  markAllTxt: { fontSize: 13, color: C.primary, fontWeight: '600' },
  list: { paddingHorizontal: 16, gap: 8, paddingTop: 8 },
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, gap: 12 },
  cardUnread: { borderColor: C.primary + '44', backgroundColor: C.primary + '08' },
  iconWrap: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: C.t1 },
  cardMsg: { fontSize: 13, color: C.tMuted, lineHeight: 18 },
  cardTime: { fontSize: 11, color: C.tLight, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary, marginTop: 4 },
  deleteBtn: { padding: 4 },
  emptyCard: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.t1 },
  emptyText: { fontSize: 13, color: C.tMuted },
});
