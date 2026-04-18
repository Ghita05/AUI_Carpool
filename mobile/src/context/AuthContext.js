/**
 * context/AuthContext.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides authentication state, the Socket.IO connection, and the global
 * post-ride review modal to the entire app.
 *
 * WHY SOCKET.IO LIVES HERE:
 *   The Socket.IO connection must:
 *     (a) open immediately after login with the user's JWT
 *     (b) close on logout
 *     (c) be accessible from any screen (ride tracking, notifications, messages)
 *   The AuthContext is the only component that satisfies all three requirements.
 *   It is instantiated once at the app root and lives for the full session.
 *
 * WHY THE REVIEW MODAL LIVES HERE:
 *   The `ride-completed` event can arrive while the user is on any screen —
 *   they might be in Settings or viewing a Profile when the GPS triggers.
 *   A global modal rendered at the root level overlays any screen correctly.
 *   Individual screens do not need to handle this event.
 *
 * SOCKET EVENTS MANAGED HERE:
 *   ride-completed     → show PostRideReviewModal
 *   late-notification  → push a local alert (passive reminder)
 *   new-message        → stored in pendingMessages state for badge display
 *   (tracking events are handled within RideDetailsScreen directly)
 */

import React, {
  createContext, useContext, useState, useCallback,
  useEffect, useRef,
} from 'react';
import { Alert } from 'react-native';
import { io as socketIO } from 'socket.io-client';
import * as authService from '../services/authService';
import { storeTokens, clearTokens, getAccessToken } from '../services/api';
import PostRideReviewModal from '../components/PostRideReviewModal';

// Must match the backend BASE_URL — imported from api.js indirectly but
// duplicated here to keep the socket client independent of the Axios instance.
const SOCKET_URL = 'http://10.126.130.29:5001';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Socket ref — stable across re-renders, cleaned up on logout
  const socketRef = useRef(null);

  // Global review modal state — populated by the ride-completed socket event
  const [reviewModal, setReviewModal] = useState({
    visible:      false,
    rideId:       null,
    destination:  '',
    participants: [],
  });

  // ── Connect Socket.IO after login ────────────────────────────────────────
  const connectSocket = useCallback(async () => {
    const token = await getAccessToken();
    if (!token || socketRef.current?.connected) return;

    const socket = socketIO(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection:        true,
      reconnectionAttempts: 10,
      reconnectionDelay:   2000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    // ── ride-completed: show the review modal ──────────────────────────────
    // Payload: { rideId, destination, participants: [{userId, name, role}] }
    socket.on('ride-completed', (data) => {
      setReviewModal({
        visible:      true,
        rideId:       data.rideId,
        destination:  data.destination,
        participants: data.participants || [],
      });
    });

    // ── late-notification: alert the user ─────────────────────────────────
    socket.on('late-notification', (data) => {
      Alert.alert('Reminder', data.message || 'Your ride departure time has passed.');
    });

    // ── ride-started: notify passenger that the ride is moving ────────────
    socket.on('ride-started', (data) => {
      Alert.alert(
        'Ride Started',
        `Your ride to ${data.destination} has begun. Open the app to track it live.`
      );
    });

    socketRef.current = socket;
  }, []);

  // ── Disconnect Socket.IO on logout ───────────────────────────────────────
  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // ── Restore session on app launch ────────────────────────────────────────
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
        }
      } catch {
        await clearTokens();
      } finally {
        setLoading(false);
      }
    };
    restoreSession();

    return () => disconnectSocket();
  }, [connectSocket, disconnectSocket]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const response = await authService.login(email, password);
    if (response.success && response.data) {
      const { accessToken, refreshToken, user: userData } = response.data;
      await storeTokens(accessToken, refreshToken);
      setUser(buildUser(userData));
      await connectSocket();
      return response;
    }
    throw new Error(response.message || 'Login failed');
  }, [connectSocket]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try { await authService.logout(); } catch {}
    await clearTokens();
    disconnectSocket();
    setUser(null);
  }, [disconnectSocket]);

  // ── Role switch (UI toggle) ───────────────────────────────────────────────
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
    }}>
      {children}

      {/* Global post-ride review modal — renders over any screen */}
      <PostRideReviewModal
        visible={reviewModal.visible}
        rideId={reviewModal.rideId}
        destination={reviewModal.destination}
        participants={reviewModal.participants}
        onDone={() => setReviewModal(prev => ({ ...prev, visible: false }))}
      />
    </AuthContext.Provider>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────
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
