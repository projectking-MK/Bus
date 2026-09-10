import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';

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

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
          <Navbar />
          <main className="flex-1">
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
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
