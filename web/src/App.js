import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './theme/variables.css';

// Auth pages
import SplashPage              from './pages/auth/SplashPage';
import LoginPage               from './pages/auth/LoginPage';
import SignupEmailPage         from './pages/auth/SignupEmailPage';
import SignupCheckInboxPage    from './pages/auth/SignupCheckInboxPage';
import SignupCompleteProfilePage from './pages/auth/SignupCompleteProfilePage';

// Main pages
import HomePage            from './pages/home/HomePage';
import RideDetailsPage     from './pages/rides/RideDetailsPage';
import MyRidesPage         from './pages/rides/MyRidesPage';
import CreateRidePage      from './pages/rides/CreateRidePage';
import MessagesPage        from './pages/messages/MessagesPage';
import NotificationsPage   from './pages/notifications/NotificationsPage';
import AccountSettingsPage from './pages/settings/AccountSettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                  element={<Navigate to="/splash" replace />} />
        <Route path="/splash"            element={<SplashPage />} />
        <Route path="/login"             element={<LoginPage />} />
        <Route path="/signup"            element={<SignupEmailPage />} />
        <Route path="/signup/inbox"      element={<SignupCheckInboxPage />} />
        <Route path="/signup/profile"    element={<SignupCompleteProfilePage />} />
        <Route path="/home"              element={<HomePage />} />
        <Route path="/rides"             element={<MyRidesPage />} />
        <Route path="/rides/:id"         element={<RideDetailsPage />} />
        <Route path="/rides/create"      element={<CreateRidePage />} />
        <Route path="/messages"          element={<MessagesPage />} />
        <Route path="/notifications"     element={<NotificationsPage />} />
        <Route path="/settings"          element={<AccountSettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
