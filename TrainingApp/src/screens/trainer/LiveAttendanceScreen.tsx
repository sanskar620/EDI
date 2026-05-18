import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { useSessionsStore } from '../../stores/sessionsStore';
import { useAttendanceStore } from '../../stores/attendanceStore';
import { useEnrollmentStore } from '../../stores/enrollmentStore';
import { usePresenceStore } from '../../stores/presenceStore';
import { UserRole } from '../../config/supabase';

export default function LiveAttendanceScreen({ navigation, route }: any) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user } = useAuthStore();
  const sessionId = route?.params?.sessionId;
  const { currentSession, fetchSessionById, isLoading: sessionLoading } = useSessionsStore();
  const { sessionAttendance, fetchSessionAttendance, markAttendance, isLoading: attendanceLoading } = useAttendanceStore();
  const { sessionEnrollments, fetchSessionEnrollments } = useEnrollmentStore();
  const { isUserOnline } = usePresenceStore();

  // Supervisors and trainers can both mark attendance
  useEffect(() => {
    const role = user?.role as any;
    if (role !== 'TRAINER' && role !== 'SUPERVISOR' && role !== 'ADMIN') {
      Alert.alert(
        'Access Denied',
        'Only trainers or supervisors can mark attendance',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [user?.role]);

  useEffect(() => {
    if (sessionId) {
      fetchSessionById(sessionId);
      fetchSessionAttendance(sessionId);
      fetchSessionEnrollments(sessionId);
    }
  }, [sessionId]);

  const isLoading = sessionLoading || attendanceLoading;
  const attendedIds = new Set(sessionAttendance.map((a: any) => a.user_id));

  const handleMarkAttendance = async (targetUserId: number, targetName: string) => {
    Alert.alert('Mark Attendance', `Mark attendance for ${targetName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Present',
        onPress: async () => {
          const success = await markAttendance(sessionId, targetUserId, user?.id || 0, { forceMarked: true, notes: `Manually marked by ${user?.full_name}` });
          if (success) {
            Alert.alert('Success', `${targetName} marked as present`);
            fetchSessionAttendance(sessionId);
          } else {
            Alert.alert('Error', 'Failed to mark attendance');
          }
        },
      },
    ]);
  };

  const enrolled = sessionEnrollments.map((e: any) => {
    const isPresent = attendedIds.has(e.user?.id || e.user_id);
    return {
      id: e.user?.id || e.user_id,
      // Backend returns flat fields: full_name, employee_id (not nested under user)
      name: e.user?.full_name || e.full_name || 'Unknown',
      employee_id: e.user?.employee_id || e.employee_id || '',
      department: e.user?.department || e.department || '',
      progress: isPresent ? 100 : (e.progress || 0),
      isPresent,
    };
  });

  const presentCount = enrolled.filter((e: any) => e.isPresent).length;
  const absentCount = enrolled.length - presentCount;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Live Attendance</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Session Info */}
          <View style={s.sessionCard}>
            <Text style={s.sessionTitle}>{currentSession?.title || 'Session'}</Text>
            <Text style={s.sessionSub}>
              {currentSession?.venue_name || 'TBD'} • {currentSession?.scheduled_date ? new Date(currentSession.scheduled_date).toLocaleDateString() : 'TBD'}
            </Text>
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            <View style={[s.statCard, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
              <Text style={[s.statVal, { color: C.success }]}>{presentCount}</Text>
              <Text style={s.statLabel}>Present</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
              <Text style={[s.statVal, { color: C.error }]}>{absentCount}</Text>
              <Text style={s.statLabel}>Absent</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
              <Text style={[s.statVal, { color: '#3b82f6' }]}>{enrolled.length}</Text>
              <Text style={s.statLabel}>Total</Text>
            </View>
          </View>

          {/* Trainee List */}
          <FlatList
            data={enrolled}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
            renderItem={({ item }) => (
              <View style={s.traineeCard}>
                <View style={s.avatarContainer}>
                  <View style={[s.avatar, { backgroundColor: item.isPresent ? C.success + '22' : C.error + '22' }]}>
                    <Text style={[s.avatarTxt, { color: item.isPresent ? C.success : C.error }]}>
                      {item.name.charAt(0)}
                    </Text>
                  </View>
                  {isUserOnline(item.id) && <View style={s.onlineDot} />}
                </View>
                <View style={s.traineeInfo}>
                  <Text style={s.userName}>{item.name}</Text>
                  <Text style={s.traineeEmpId}>{item.employee_id} • {item.department}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                    <View style={{ flex: 1, height: 4, backgroundColor: C.border, borderRadius: 2 }}>
                      <View style={{ width: `${Math.min(item.progress, 100)}%`, height: '100%', backgroundColor: '#3b82f6', borderRadius: 2 }} />
                    </View>
                    <Text style={{ fontSize: 10, color: C.tMuted, fontWeight: '700' }}>{Math.round(item.progress)}%</Text>
                  </View>
                </View>
                {item.isPresent ? (
                  <View style={s.presentBadge}>
                    <MaterialIcons name="check-circle" size={20} color={C.success} />
                    <Text style={s.presentTxt}>Present</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={s.markBtn} onPress={() => handleMarkAttendance(item.id, item.name)}>
                    <MaterialIcons name="person-add" size={18} color={C.white} />
                    <Text style={s.markBtnTxt}>Mark</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            ListEmptyComponent={
              <View style={s.emptyCard}>
                <MaterialIcons name="group" size={48} color={C.tMuted} />
                <Text style={s.emptyTxt}>No trainees enrolled in this session</Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.t1 },
  sessionCard: { marginHorizontal: 16, marginTop: 16, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16 },
  sessionTitle: { fontSize: 16, fontWeight: '700', color: C.t1 },
  sessionSub: { fontSize: 13, color: C.tMuted, marginTop: 4 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginVertical: 16 },
  statCard: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, color: C.tMuted, marginTop: 4 },
  traineeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 8, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 16, fontWeight: '800' },
  avatarContainer: { position: 'relative' },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  traineeInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: C.t1 },
  traineeEmpId: { fontSize: 12, color: C.tMuted, marginTop: 2 },
  presentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  presentTxt: { fontSize: 12, color: C.success, fontWeight: '600' },
  markBtn: { flexDirection: 'row', backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', gap: 4 },
  markBtnTxt: { color: C.white, fontSize: 12, fontWeight: '700' },
  emptyCard: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyTxt: { fontSize: 14, color: C.tMuted },
});
