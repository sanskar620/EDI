import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import api, { API_BASE_URL } from '../../services/api';
import authService from '../../services/authService';

export default function PushNotificationsScreen({ navigation }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user, getAllUsers } = useAuthStore();
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState<'ALL' | 'TRAINEE' | 'TRAINER'>('ALL');
  const [isSending, setIsSending] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Supabase realtime removed. Relying on manual refresh or useFocusEffect if needed.
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const { API_BASE_URL } = require('../../services/api');
      const token = authService.getAuthToken();
      const res = await fetch(`${API_BASE_URL}/notifications/all?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNotification = async (id: number) => {
    Alert.alert('Delete', 'Are you sure you want to delete this notification?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            const token = authService.getAuthToken();
            const res = await fetch(`${API_BASE_URL}/notifications/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              setNotifications(prev => prev.filter(n => n.id !== id));
            } else {
              Alert.alert('Error', 'Failed to delete notification');
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    ]);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Error', 'Please enter a title and message.');
      return;
    }
    
    setIsSending(true);
    try {
      // 1. Get users based on target role
      const users = await getAllUsers(targetRole === 'ALL' ? undefined : { role: targetRole });
      if (!users || users.length === 0) {
        Alert.alert('Info', 'No users found for the selected role.');
        setIsSending(false);
        return;
      }

      const userIds = users.map((u: any) => u.id);
      
      // 2. Send via API
      const token = authService.getAuthToken();
      await api.sendNotifications(token!, userIds, 'GENERAL', title.trim(), message.trim());
      
      Alert.alert('Success', `Notification sent to ${userIds.length} users!`);
      setTitle('');
      setMessage('');
      setTargetRole('ALL');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send notification');
    } finally {
      setIsLoading(false);
      setIsSending(false);
      fetchNotifications();
    }
  };


  const getTargetLabel = (role: string) => {
    switch(role) {
      case 'TRAINEE': return 'Trainees Only';
      case 'TRAINER': return 'Trainers Only';
      default: return 'Everyone';
    }
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Push Notifications</Text>
      </View>
      
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={s.composeCard}>
          <Text style={s.cardTitle}>New Notification</Text>
          
          <Text style={s.label}>Title</Text>
          <TextInput 
            style={s.input} 
            placeholder="e.g. System Maintenance" 
            placeholderTextColor={C.tMuted}
            value={title}
            onChangeText={setTitle}
          />
          
          <Text style={s.label}>Message</Text>
          <TextInput 
            style={[s.input, { height: 100, textAlignVertical: 'top' }]} 
            placeholder="Enter announcement details..." 
            placeholderTextColor={C.tMuted}
            multiline
            value={message}
            onChangeText={setMessage}
          />
          
          <Text style={s.label}>Target Audience</Text>
          <View style={s.roleRow}>
            {['ALL', 'TRAINEE', 'TRAINER'].map((r) => (
              <TouchableOpacity 
                key={r} 
                style={[s.roleBtn, targetRole === r && s.roleBtnActive]}
                onPress={() => setTargetRole(r as any)}
              >
                <Text style={[s.roleTxt, targetRole === r && s.roleTxtActive]}>{getTargetLabel(r)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity 
            style={[s.sendBtn, (!title.trim() || !message.trim()) && { opacity: 0.5 }]} 
            onPress={handleSend}
            disabled={isSending || !title.trim() || !message.trim()}
          >
            {isSending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="send" size={20} color="#fff" />
                <Text style={s.sendBtnTxt}>Publish Notification</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        <Text style={s.historyTitle}>Recent Notifications</Text>
        
        {isLoading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
        ) : notifications.length === 0 ? (
          <Text style={s.emptyTxt}>No notifications sent yet.</Text>
        ) : (
          notifications.map((item) => (
            <View key={item.id} style={s.historyCard}>
              <View style={s.historyTop}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={[s.targetBadge, { backgroundColor: C.primary + '20' }]}>
                    <Text style={[s.targetTxt, { color: C.primary }]}>{getTargetLabel(item.target_role)}</Text>
                  </View>
                  {item.recipient_count > 1 && (
                    <View style={[s.targetBadge, { backgroundColor: '#10b981' + '20' }]}>
                      <Text style={[s.targetTxt, { color: '#10b981' }]}>{item.recipient_count} recipients</Text>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={s.dateTxt}>{new Date(item.created_at).toLocaleString()}</Text>
                  <TouchableOpacity onPress={() => handleDeleteNotification(item.id)} style={{ padding: 4 }}>
                    <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={s.historyCardTitle}>{item.title}</Text>
              <Text style={s.historyCardMsg}>{item.message}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.t1 },
  composeCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 24 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.t1, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: C.tMuted, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 15, color: C.t1 },
  roleRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  roleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  roleBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  roleTxt: { fontSize: 12, fontWeight: '600', color: C.tMuted },
  roleTxtActive: { color: '#fff' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.primary, paddingVertical: 14, borderRadius: 12, marginTop: 20, gap: 8 },
  sendBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  historyTitle: { fontSize: 18, fontWeight: '800', color: C.t1, marginBottom: 12 },
  historyCard: { backgroundColor: C.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  targetBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  targetTxt: { fontSize: 10, fontWeight: '800' },
  dateTxt: { fontSize: 12, color: C.tMuted },
  historyCardTitle: { fontSize: 16, fontWeight: '700', color: C.t1, marginBottom: 4 },
  historyCardMsg: { fontSize: 14, color: C.tMuted, lineHeight: 20 },
  emptyTxt: { textAlign: 'center', color: C.tMuted, marginTop: 20 },
});
