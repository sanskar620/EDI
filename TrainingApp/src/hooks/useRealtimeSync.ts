/**
 * useRealtimeSync — Custom hook that maintains a WebSocket connection
 * to the backend and triggers store refreshes when data changes.
 * 
 * Usage: Call once in the root App or main dashboard component.
 *   useRealtimeSync();
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { useSessionsStore } from '../stores/sessionsStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useAttendanceStore } from '../stores/attendanceStore';
import { useMaterialsStore } from '../stores/materialsStore';
import { useCourseStore } from '../stores/courseStore';
import { useAssessmentStore } from '../stores/assessmentStore';
import { usePresenceStore } from '../stores/presenceStore';

// Derive WS URL from the HTTP API base URL
const API_BASE_URL = 'http://192.168.0.107:8000';
const WS_URL = API_BASE_URL.replace(/^http/, 'ws') + '/ws/sync';

interface SyncMessage {
  event: string;
  entity: string;
  action: string;
  data?: any;
}

export function useRealtimeSync() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user, isAuthenticated, getAllUsers } = useAuthStore();
  const { fetchSessions } = useSessionsStore();
  const { fetchNotifications, fetchUnreadCount } = useNotificationStore();
  const { fetchSessionAttendance, fetchUserHistory, sessionAttendance } = useAttendanceStore();
  const { fetchMaterials } = useMaterialsStore();
  const { fetchEnrolledCourses, fetchPublishedCourses, fetchTrainerCourses } = useCourseStore();
  const { fetchQuestions, fetchResults } = useAssessmentStore();
  const { setOnlineUsers } = usePresenceStore();

  const userId = user?.id;

  const handleMessage = useCallback((msg: any) => {
    if (msg.event === 'presence_update') {
      setOnlineUsers(msg.online_user_ids || []);
      return;
    }

    if (msg.event !== 'data_changed') return;

    if (!userId) return;

    switch (msg.entity) {
      case 'enrollment':
      case 'session':
        // Re-fetch sessions to reflect enrollment / session changes
        fetchSessions({ role: user?.role, currentUserId: userId });
        break;

      case 'course':
        // Refresh courses
        fetchEnrolledCourses(userId);
        fetchPublishedCourses();
        if (user?.role === 'TRAINER') {
          fetchTrainerCourses(userId);
        }
        break;

      case 'notification':
        // Re-fetch notifications for current user
        fetchNotifications(userId);
        fetchUnreadCount(userId);
        break;

      case 'attendance':
        // If we are currently viewing a session's attendance, refresh it
        if (msg.data?.session_id) {
          fetchSessionAttendance(msg.data.session_id);
        }
        // Also refresh user history
        fetchUserHistory(userId);
        break;

      case 'material':
      case 'course_material':
        // Refresh materials list
        fetchMaterials();
        break;

      case 'assessment_question':
        // Refresh questions if viewing a session
        if (msg.data?.session_id) {
          fetchQuestions({ sessionId: msg.data.session_id });
        }
        break;

      case 'assessment_result':
        // Refresh results if viewing a session assessment
        if (msg.data?.session_id) {
          fetchResults(msg.data.session_id);
        }
        // Also refresh user history
        fetchUserHistory(userId);
        break;

      case 'user':
        // User list changed — relevant for supervisor dashboards
        getAllUsers();
        break;

      default:
        break;
    }
  }, [
    user, 
    fetchSessions, 
    fetchNotifications, 
    fetchUnreadCount, 
    fetchSessionAttendance, 
    fetchUserHistory, 
    fetchMaterials, 
    fetchEnrolledCourses, 
    fetchPublishedCourses, 
    fetchTrainerCourses, 
    fetchQuestions, 
    fetchResults,
    getAllUsers
  ]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || !userId) return;

    try {
      const urlWithId = `${WS_URL}?user_id=${userId}`;
      const ws = new WebSocket(urlWithId);

      ws.onopen = () => {
        console.log('[WS] Connected to sync server');
      };

      ws.onmessage = (event) => {
        try {
          const msg: SyncMessage = JSON.parse(event.data);
          handleMessage(msg);
        } catch {
          // Ignore non-JSON messages
        }
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected, will reconnect in 5s');
        wsRef.current = null;
        // Auto-reconnect after 5 seconds
        reconnectTimer.current = setTimeout(connect, 5000);
      };

      ws.onerror = (err) => {
        console.log('[WS] Error:', err);
        ws.close();
      };

      wsRef.current = ws;
    } catch (err) {
      console.log('[WS] Connection failed, retrying in 5s');
      reconnectTimer.current = setTimeout(connect, 5000);
    }
  }, [handleMessage, userId]);

  useEffect(() => {
    if (!isAuthenticated) return;

    connect();

    // Reconnect when app comes back to foreground
    const appStateListener = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && isAuthenticated) {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          connect();
        }
      }
    });

    return () => {
      appStateListener.remove();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, connect]);

  // Send periodic pings to keep connection alive
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, []);
}
