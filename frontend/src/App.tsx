import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import SecurityApp from './pages/security/SecurityApp';
import HODDashboard from './pages/hod/HODDashboard';
import MentorDashboard from './pages/mentor/MentorDashboard';
import StudentDashboard from './pages/StudentDashboard';
import GlobalModal from './components/GlobalModal';
import ToastOverlay from './components/ToastOverlay';
import LiquidPointer from './components/LiquidPointer';
import { useAuthStore } from './store';
import { toast } from './utils/toast';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const token = useAuthStore(s => s.token);
  const role = useAuthStore(s => s.role);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    toast.error(`Access Denied: Logged in as '${role}'. Please logout first to access a different portal.`);
    if (role === 'security') return <Navigate to="/security" replace />;
    if (role === 'hod') return <Navigate to="/hod" replace />;
    if (role === 'mentor') return <Navigate to="/mentor" replace />;
    if (role === 'student') return <Navigate to="/student" replace />;
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Security Staff Portal - Strictly Security Only */}
          <Route path="/security" element={
            <ProtectedRoute allowedRoles={['security']}>
              <SecurityApp />
            </ProtectedRoute>
          } />

          {/* HOD Portal - Strictly HOD Only */}
          <Route path="/hod" element={
            <ProtectedRoute allowedRoles={['hod']}>
              <HODDashboard />
            </ProtectedRoute>
          } />

          {/* Mentor Portal - Strictly Mentor Only */}
          <Route path="/mentor" element={
            <ProtectedRoute allowedRoles={['mentor']}>
              <MentorDashboard />
            </ProtectedRoute>
          } />

          {/* Student Portal - Strictly Students Only */}
          <Route path="/student/*" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          } />

          {/* Admin & Super Admin Portal - Strictly Admin & Super Admin Only */}
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <GlobalModal />
      <ToastOverlay />
      <LiquidPointer />
    </>
  );
}

export default App;
