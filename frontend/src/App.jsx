import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Watermark } from './components/Watermark';

// Pages
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { StudentList } from './pages/admin/StudentList';
import { AttendanceLog } from './pages/admin/AttendanceLog';
import { TripConfig } from './pages/admin/TripConfig';
import { DriverDashboard } from './pages/driver/DriverDashboard';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { ScanAttendance } from './pages/student/ScanAttendance';

// Root redirector based on authenticated user's role
const RootRedirect = () => {
  const { user, loading } = useAuth();
  const token = localStorage.getItem('smart_bus_auth_token');
  const isDriverSession = localStorage.getItem('smart_bus_driver_session') === 'true';

  // Fast path for driver: never bounce to login, continue directly on driver page
  if (token && (isDriverSession || user?.role === 'DRIVER')) {
    return <Navigate to="/driver/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'DRIVER') return <Navigate to="/driver/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
};

const AppContent = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 relative">
      <Navbar />
      <main className="flex-1">
        <ErrorBoundary>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />

            {/* Root redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Admin routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <StudentList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/attendance"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AttendanceLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/trips"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <TripConfig />
                </ProtectedRoute>
              }
            />

            {/* Driver route */}
            <Route
              path="/driver/dashboard"
              element={
                <ProtectedRoute allowedRoles={['DRIVER']}>
                  <DriverDashboard />
                </ProtectedRoute>
              }
            />

            {/* Student routes */}
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/scan"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <ScanAttendance />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>

      {/* Global Watermark (repeating diagonal watermark & corner badge) */}
      <Watermark />

      {/* Global Layout Footer for authenticated pages */}
      {!isLoginPage && (
        <footer className="py-6 border-t border-slate-200 bg-white/70 backdrop-blur-sm text-center relative z-10">
          <div className="max-w-7xl mx-auto px-4 space-y-0.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Developed and Maintained by
            </p>
            <p className="text-sm sm:text-base font-black text-slate-800 tracking-wide">
              Kowshiek R
            </p>
            <p className="text-xs text-slate-500 font-semibold">
              Department of IT
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
