import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './theme/variables.css';
import { AdminAuthProvider } from './context/AdminAuthContext';
import AdminLoginPage   from './pages/auth/AdminLoginPage';
import AdminDashboard   from './pages/admin/AdminDashboard';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

export default function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"                element={<Navigate to="/login" replace />} />
          <Route path="/login"           element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={
            <ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>
          } />
          <Route path="*"               element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}
