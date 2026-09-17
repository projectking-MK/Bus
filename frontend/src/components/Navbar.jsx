import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bus, User, LogOut, QrCode, Users, FileText, Settings, ShieldCheck, MapPin } from 'lucide-react';

export const Navbar = () => {
  const { user, student, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 tracking-tight text-lg">SmartBus</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Bus No-09
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">College Attendance Monitoring System</p>
            </div>
          </div>

          {/* Navigation links based on role */}
          <nav className="hidden md:flex items-center space-x-1">
            {user.role === 'ADMIN' && (
              <>
                <Link
                  to="/admin/dashboard"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive('/admin/dashboard')
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/students"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
                    isActive('/admin/students')
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Students (55)</span>
                </Link>
                <Link
                  to="/admin/attendance"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
                    isActive('/admin/attendance')
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Attendance Logs</span>
                </Link>
                <Link
                  to="/admin/trips"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
                    isActive('/admin/trips')
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>Trips & Geofence</span>
                </Link>
              </>
            )}

            {user.role === 'DRIVER' && (
              <>
                <Link
                  to="/driver/dashboard"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
                    isActive('/driver/dashboard')
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Bus className="w-4 h-4" />
                  <span>Trip Controller & QR</span>
                </Link>
              </>
            )}

            {user.role === 'STUDENT' && (
              <>
                <Link
                  to="/student/dashboard"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive('/student/dashboard')
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Overview
                </Link>
                <Link
                  to="/student/scan"
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
                    isActive('/student/scan')
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-300'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Scan Attendance</span>
                </Link>
              </>
            )}
          </nav>

          {/* User Profile info & Logout */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="flex items-center justify-end space-x-1.5">
                <span className="text-sm font-semibold text-slate-800">{user.name}</span>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                    user.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-700'
                      : user.role === 'DRIVER'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {user.role}
                </span>
              </div>
              {student && (
                <p className="text-xs text-slate-500 font-mono">
                  Roll: {student.rollNumber}
                </p>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile bottom nav for students */}
      {user.role === 'STUDENT' && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-2 flex justify-around items-center">
          <Link
            to="/student/dashboard"
            className={`flex flex-col items-center py-1 px-3 text-xs font-medium rounded-lg ${
              isActive('/student/dashboard') ? 'text-indigo-600' : 'text-slate-500'
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            Dashboard
          </Link>
          <Link
            to="/student/scan"
            className={`flex flex-col items-center py-1 px-3 text-xs font-medium rounded-lg ${
              isActive('/student/scan') ? 'text-indigo-600 font-bold' : 'text-slate-500'
            }`}
          >
            <QrCode className="w-5 h-5 mb-0.5" />
            Scan QR
          </Link>
        </div>
      )}
    </header>
  );
};
