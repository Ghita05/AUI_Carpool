import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

/**
 * Wraps a route so it only renders for authenticated admins.
 * While the session is being restored from storage, renders a blank screen.
 * Unauthenticated visitors are redirected to /login.
 */
export default function ProtectedAdminRoute({ children }) {
  const { isAuthenticated, loading } = useAdminAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
