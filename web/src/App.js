import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './theme/variables.css';

import SplashPage from './pages/auth/SplashPage';
import LoginPage from './pages/auth/LoginPage';
import SignupEmailPage from './pages/auth/SignupEmailPage';
import SignupCheckInboxPage from './pages/auth/SignupCheckInboxPage';
import SignupCompleteProfilePage from './pages/auth/SignupCompleteProfilePage';
import HomePage from './pages/home/HomePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/splash" replace />} />
        <Route path="/splash" element={<SplashPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupEmailPage />} />
        <Route path="/signup/inbox" element={<SignupCheckInboxPage />} />
        <Route path="/signup/profile" element={<SignupCompleteProfilePage />} />
        <Route path="/home" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
