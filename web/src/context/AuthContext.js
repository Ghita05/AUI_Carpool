import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState({
    firstName: 'Ghita',
    lastName: 'Nafa',
    email: 'g.nafa@aui.ma',
    role: 'driver',        // 'driver' | 'passenger'
    initials: 'GN',
    rating: 4.8,
    rides: 23,
    isAuthenticated: true,
  });

  const switchRole = useCallback((role) => {
    setUser(prev => ({ ...prev, role }));
  }, []);

  const logout = useCallback(() => {
    setUser(prev => ({ ...prev, isAuthenticated: false }));
  }, []);

  const isDriver = user.role === 'driver';
  const isPassenger = user.role === 'passenger';

  return (
    <AuthContext.Provider value={{ user, setUser, switchRole, logout, isDriver, isPassenger }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
