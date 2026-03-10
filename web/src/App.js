import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './theme/variables.css';
import Layout from './components/Layout';

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

function W({ children }) { return <Layout>{children}</Layout>; }

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                  element={<Navigate to="/splash" replace />} />

        {/* Auth — no sidebar */}
        <Route path="/splash"            element={<SplashPage />} />
        <Route path="/login"             element={<LoginPage />} />
        <Route path="/signup"            element={<SignupEmailPage />} />
        <Route path="/signup/inbox"      element={<SignupCheckInboxPage />} />
        <Route path="/signup/profile"    element={<SignupCompleteProfilePage />} />

        {/* Main app — with sidebar */}
        <Route path="/home"              element={<W><HomePage /></W>} />
        <Route path="/rides"             element={<W><MyRidesPage /></W>} />
        <Route path="/rides/create"      element={<W><CreateRidePage /></W>} />
        <Route path="/rides/:id"         element={<W><RideDetailsPage /></W>} />
        <Route path="/messages"          element={<W><MessagesPage /></W>} />
        <Route path="/notifications"     element={<W><NotificationsPage /></W>} />
        <Route path="/settings"          element={<W><AccountSettingsPage /></W>} />
      </Routes>
    </BrowserRouter>
  );
}
