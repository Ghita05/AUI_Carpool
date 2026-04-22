import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AdminAuthContext = createContext(null);

const SESSION_KEY = 'aui_admin_session';
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);          // null = not logged in
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);      // true while we restore session

  // Restore session from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const { admin: storedAdmin, token: storedToken } = JSON.parse(stored);
        setAdmin(storedAdmin);
        setToken(storedToken);
      }
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_BASE}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    const { user, accessToken } = data.data;

    if (user.role !== 'Admin') {
      throw new Error('Access denied. Admin accounts only.');
    }

    setAdmin(user);
    setToken(accessToken);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ admin: user, token: accessToken }));
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await fetch(`${API_BASE}/api/users/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // best-effort
      }
    }
    setAdmin(null);
    setToken(null);
    sessionStorage.removeItem(SESSION_KEY);
  }, [token]);

  const isAuthenticated = !!admin && !!token;

  return (
    <AdminAuthContext.Provider value={{ admin, token, isAuthenticated, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within <AdminAuthProvider>');
  return ctx;
}
