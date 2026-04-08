import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as authService from '../services/authService';
import { storeTokens, clearTokens, getAccessToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session on app launch ──
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await getAccessToken();
        if (!token) { setLoading(false); return; }

        const response = await authService.getMe();
        if (response.success && response.data?.user) {
          const u = response.data.user;
          setUser({
            ...u,
            initials: ((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase(),
            isAuthenticated: true,
          });
        }
      } catch {
        await clearTokens();
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  // ── Login ──
  const login = useCallback(async (email, password) => {
    const response = await authService.login(email, password);
    if (response.success && response.data) {
      const { accessToken, refreshToken, user: userData } = response.data;
      await storeTokens(accessToken, refreshToken);
      setUser({
        ...userData,
        initials: ((userData.firstName?.[0] || '') + (userData.lastName?.[0] || '')).toUpperCase(),
        isAuthenticated: true,
      });
      return response;
    }
    throw new Error(response.message || 'Login failed');
  }, []);

  // ── Logout ──
  const logout = useCallback(async () => {
    try { await authService.logout(); } catch {}
    await clearTokens();
    setUser(null);
  }, []);

  // ── Switch role (UI toggle) ──
  const switchRole = useCallback((role) => {
    setUser(prev => prev ? { ...prev, role } : prev);
  }, []);

  const isDriver = user?.role === 'Driver';
  const isPassenger = user?.role === 'Passenger';
  const isAuthenticated = !!user?.isAuthenticated;

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, switchRole, isDriver, isPassenger, isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
