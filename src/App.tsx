import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";

import Navbar from "./components/Navbar";
import LoginModal from "./components/LoginModal";

import LandingPage from "./components/LandingPage";
import FeedPage from "./components/FeedPage";
import ProfilePage from "./components/ProfilePage";
import GenealogyPage from "./components/GenealogyPage";
import ChatPage from "./components/ChatPage";
import ConnectionsPage from "./components/ConnectionsPage";
import DashboardPage from "./components/DashboardPage";

import { authService } from "./services/authService";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const authenticated = authService.isAuthenticated();
    setIsAuthenticated(authenticated);
    // Removed auto-show login modal logic
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setShowLoginModal(false);
    // Modal handles specific navigation, but default is profile
    const role = localStorage.getItem('userRole');
    if (role === 'admin') {
      navigate('/dashboard');
    } else {
      navigate('/profile');
    }
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    navigate('/'); // Navigate to Landing Page on logout
  };

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-gray-50">
        <Navbar
          isAuthenticated={isAuthenticated}
          onLoginClick={() => setShowLoginModal(true)}
          onLogout={handleLogout}
        />

        <Routes>
          {/* Public Landing Page */}
          <Route
            path="/"
            element={
              isAuthenticated ? <Navigate to="/profile" /> : <LandingPage onLoginClick={() => setShowLoginModal(true)} />
            }
          />

          {/* Protected Feed Page */}
          <Route
            path="/home"
            element={
              isAuthenticated ? (
                localStorage.getItem('userRole') === 'admin' ? <Navigate to="/dashboard" /> : <FeedPage />
              ) : <Navigate to="/" />
            }
          />

          <Route
            path="/profile"
            element={
              isAuthenticated ? (
                localStorage.getItem('userRole') === 'admin' ? <Navigate to="/dashboard" /> : <ProfilePage />
              ) : <Navigate to="/" />
            }
          />

          <Route
            path="/genealogy"
            element={
              isAuthenticated ? (
                localStorage.getItem('userRole') === 'admin' ? <Navigate to="/dashboard" /> : <GenealogyPage />
              ) : <Navigate to="/" />
            }
          />

          <Route
            path="/chat"
            element={
              isAuthenticated ? (
                localStorage.getItem('userRole') === 'admin' ? <Navigate to="/dashboard" /> : <ChatPage />
              ) : <Navigate to="/" />
            }
          />

          <Route
            path="/connections"
            element={
              isAuthenticated ? (
                localStorage.getItem('userRole') === 'admin' ? <Navigate to="/dashboard" /> : <ConnectionsPage />
              ) : <Navigate to="/" />
            }
          />

          <Route
            path="/dashboard"
            element={
              isAuthenticated ? <DashboardPage /> : <Navigate to="/" />
            }
          />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLogin}
          onNavigate={(page) => navigate(page)}
        />
      </div>
    </LanguageProvider>
  );
}
