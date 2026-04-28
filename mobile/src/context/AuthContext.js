// Auth context — provides user state, Socket.IO connection, and the global post-ride review modal to the entire app.
// The socket lives here because it must open on login and be accessible from any screen.

import React, {
  createContext, useContext, useState, useCallback,
  useEffect, useRef,
} from 'react';
import { Alert, View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { io as socketIO } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import * as authService from '../services/authService';
import * as notifService from '../services/notificationService';
import { storeTokens, clearTokens, getAccessToken } from '../services/api';
import PostRideReviewModal from '../components/PostRideReviewModal';
import { API_BASE_URL } from '../config';

// Derived from the central config so both HTTP and WebSocket always target the same server.
const SOCKET_URL = API_BASE_URL;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Badge counters per tab
  // rideBadge   → Reminder notifications (green on Rides tab)
  // notifBadge  → total unread notifications (red on Notifications tab)
  // msgBadge    → unread direct messages (blue on Messages tab)
  const [rideBadge,  setRideBadge]  = useState(0);
  const [notifBadge, setNotifBadge] = useState(0);
  const [msgBadge,   setMsgBadge]   = useState(0);

  // Latest notification received via socket — screens subscribe to prepend instantly
  const [latestNotif, setLatestNotif] = useState(null);

  // In-app notification toast
  const [toast, setToast] = useState(null); // { title, content, type }
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef(null);

  // Socket ref — stable across re-renders, cleaned up on logout
  const socketRef = useRef(null);

  // Global review modal state — populated by the ride-completed socket event
  const [reviewModal, setReviewModal] = useState({
    visible:      false,
    rideId:       null,
    destination:  '',
    participants: [],
  });

  // Toast banner
  const showToast = useCallback((notif) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(notif);
    toastAnim.setValue(0);
    Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(
        () => setToast(null)
      );
    }, 4000);
  }, [toastAnim]);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(
      () => setToast(null)
    );
  }, [toastAnim]);

  // Badge helpers
  const clearTabBadge = useCallback((tab) => {
    if (tab === 'Rides')         setRideBadge(0);
    if (tab === 'Notifications') setNotifBadge(0);
    if (tab === 'Messages')      setMsgBadge(0);
  }, []);

  const incrementMsgBadge = useCallback(() => {
    setMsgBadge(prev => prev + 1);
  }, []);

  const clearLatestNotif = useCallback(() => setLatestNotif(null), []);

  // Fetch initial unread counts
  const fetchInitialBadges = useCallback(async () => {
    try {
      const res = await notifService.getNotifications(1, 100);
      const notifs = res.data?.notifications || [];
      const unread = notifs.filter(n => !n.readStatus);
      setNotifBadge(unread.length);
      setRideBadge(unread.filter(n => n.type === 'Reminder').length);
    } catch { /* non-critical */ }
  }, []);

  // Connect Socket.IO after login
  const connectSocket = useCallback(async () => {
    const token = await getAccessToken();
    if (!token || socketRef.current?.connected) return;

    const socket = socketIO(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection:        true,
      reconnectionAttempts: 10,
      reconnectionDelay:   1000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    // new-notification: show banner + increment badge
    socket.on('new-notification', ({ notification }) => {
      if (!notification) return;
      showToast(notification);
      setLatestNotif(notification);          // screens subscribe to get instant update
      setNotifBadge(prev => prev + 1);
      if (notification.type === 'Reminder') setRideBadge(prev => prev + 1);
    });

    // ride-completed: show the review modal
    // Payload: { rideId, destination, participants: [{userId, name, role}] }
    socket.on('ride-completed', (data) => {
      setReviewModal({
        visible:      true,
        rideId:       data.rideId,
        destination:  data.destination,
        participants: data.participants || [],
      });
    });

    // late-notification: already handled by new-notification
    socket.on('late-notification', () => {});

    // ride-started: notify passenger that the ride is moving
    socket.on('ride-started', (data) => {
      Alert.alert(
        'Ride Started',
        `Your ride to ${data.destination} has begun. Open the app to track it live.`
      );
    });

    // new-stop-request: alert driver of an incoming stop request
    socket.on('new-stop-request', (data) => {
      Alert.alert(
        'Stop Request',
        `${data.passengerName} requested a stop at ${data.stopLocation} on your ride to ${data.destination}. Open the ride to accept or decline.`
      );
    });

    socketRef.current = socket;
  }, [showToast]);

  // Disconnect Socket.IO on logout
  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // Restore session on app launch
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await getAccessToken();
        if (!token) { setLoading(false); return; }

        const response = await authService.getMe();
        if (response.success && response.data?.user) {
          const u = response.data.user;
          setUser(buildUser(u));
          // Reconnect socket for restored sessions
          await connectSocket();
          await fetchInitialBadges();
        }
      } catch {
        await clearTokens();
      } finally {
        setLoading(false);
      }
    };
    restoreSession();

    return () => disconnectSocket();
  }, [connectSocket, disconnectSocket, fetchInitialBadges]);

  // Login
  const login = useCallback(async (email, password) => {
    const response = await authService.login(email, password);
    if (response.success && response.data) {
      const { accessToken, refreshToken, user: userData } = response.data;
      await storeTokens(accessToken, refreshToken);
      setUser(buildUser(userData));
      await connectSocket();
      await fetchInitialBadges();
      return response;
    }
    throw new Error(response.message || 'Login failed');
  }, [connectSocket, fetchInitialBadges]);

  // Logout
  const logout = useCallback(async () => {
    try { await authService.logout(); } catch {}
    await clearTokens();
    disconnectSocket();
    setUser(null);
    setRideBadge(0);
    setNotifBadge(0);
    setMsgBadge(0);
  }, [disconnectSocket]);

  // Role switch (UI toggle)
  const switchRole = useCallback((role) => {
    setUser(prev => prev ? { ...prev, role } : prev);
  }, []);

  const isDriver        = user?.role === 'Driver';
  const isPassenger     = user?.role === 'Passenger';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      user, setUser, login, logout, switchRole,
      isDriver, isPassenger, isAuthenticated, loading,
      socket: socketRef, // expose ref so screens can add ride-specific listeners
      // Badge counts
      rideBadge, notifBadge, msgBadge,
      clearTabBadge, incrementMsgBadge,
      latestNotif, clearLatestNotif,
    }}>
      <View style={{ flex: 1 }}>
      {children}

      {/* Global post-ride review modal — renders over any screen */}
      <PostRideReviewModal
        visible={reviewModal.visible}
        rideId={reviewModal.rideId}
        destination={reviewModal.destination}
        participants={reviewModal.participants}
        userId={user?._id?.toString()}
        onDone={() => setReviewModal(prev => ({ ...prev, visible: false }))}
      />

      {/* Global in-app notification toast — pointer-events passthrough so nav is still usable */}
      <View style={[StyleSheet.absoluteFillObject, { zIndex: 9998 }]} pointerEvents="box-none">
        {toast && (
          <Animated.View
            style={[
              toastStyles.container,
              {
                opacity: toastAnim,
                transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }) }],
              },
            ]}
          >
            <TouchableOpacity style={toastStyles.inner} onPress={dismissToast} activeOpacity={0.9}>
              <View style={[toastStyles.iconWrap, { backgroundColor: TOAST_COLORS[toast.type]?.bg || '#EEF2FF' }]}>
                <Ionicons name={TOAST_COLORS[toast.type]?.icon || 'notifications'} size={18} color={TOAST_COLORS[toast.type]?.color || '#6366F1'} />
              </View>
              <View style={toastStyles.textWrap}>
                <Text style={toastStyles.title} numberOfLines={1}>{toast.title}</Text>
                <Text style={toastStyles.content} numberOfLines={2}>{toast.content}</Text>
              </View>
              <TouchableOpacity onPress={dismissToast} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Ionicons name="close" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
      </View>
    </AuthContext.Provider>
  );
}

// Toast appearance config
const TOAST_COLORS = {
  Booking:      { icon: 'checkmark-circle', bg: '#ECFDF5', color: '#10B981' },
  Reminder:     { icon: 'time',             bg: '#FEF3C7', color: '#F59E0B' },
  Cancellation: { icon: 'close-circle',     bg: '#FEF2F2', color: '#EF4444' },
  Alert:        { icon: 'information-circle',bg: '#EFF6FF', color: '#3B82F6' },
  System:       { icon: 'notifications',    bg: '#F5F3FF', color: '#8B5CF6' },
};

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 55,
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  content: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
});

// Helper
function buildUser(u) {
  return {
    ...u,
    initials:        ((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase(),
    isAuthenticated: true,
  };
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
