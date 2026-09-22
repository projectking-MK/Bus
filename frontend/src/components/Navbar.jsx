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
  const isStudentView = user.role === 'STUDENT' || location.pathname.startsWith('/student');

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur transition-colors ${
        isStudentView
          ? 'bg-[#050b07]/95 border-b border-emerald-500/25 shadow-md shadow-emerald-950/40 text-slate-100'
          : 'bg-white/95 border-b border-slate-200 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl overflow-hidden shadow-md border-2 flex items-center justify-center flex-shrink-0 ${
                isStudentView
                  ? 'border-yellow-400/70 shadow-emerald-900/30 bg-[#09150e]'
                  : 'border-yellow-400 shadow-yellow-500/20 bg-yellow-50'
              }`}
            >
              <img
                src="/bus-logo.jpg"
                alt="VSB Institutions Bus 09"
                className="w-full h-full object-cover object-center"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`font-black tracking-tight text-lg ${
                    isStudentView ? 'text-slate-100' : 'text-slate-900'
                  }`}
                >
                  <span className={isStudentView ? 'text-emerald-400' : 'text-emerald-700'}>
                    Smart
                  </span>
                  Bus
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-black bg-yellow-400 text-slate-950 shadow-xs">
                  BUS-09
                </span>
              </div>
              <p
                className={`text-xs hidden sm:block ${
                  isStudentView ? 'text-emerald-400/70 font-mono' : 'text-slate-500 font-medium'
                }`}
              >
                VSB Institutions • Bus Attendance
              </p>
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition ${
                    isActive('/student/dashboard')
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-emerald-300 hover:bg-[#09150e]'
                  }`}
                >
                  OVERVIEW
                </Link>
                <Link
                  to="/student/scan"
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition flex items-center space-x-1.5 ${
                    isActive('/student/scan')
                      ? 'bg-gradient-to-r from-emerald-400 to-yellow-400 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                      : 'bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400/20 border border-yellow-400/30'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>SCAN RADAR</span>
                </Link>
              </>
            )}
          </nav>

          {/* User Profile info & Logout */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="flex items-center justify-end space-x-1.5">
                <span
                  className={`text-sm font-semibold ${
                    isStudentView ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  {user.role === 'ADMIN'
                    ? (user.name && !user.name.includes('Ramanathan') ? user.name : 'R. Kowshiek IT')
                    : user.role === 'DRIVER'
                    ? (user.name && !user.name.includes('Muthuvel') ? user.name : 'Anand')
                    : user.name}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                    user.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-700'
                      : user.role === 'DRIVER'
                      ? 'bg-amber-100 text-amber-800'
                      : isStudentView
                      ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 font-mono font-black'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {user.role}
                </span>
              </div>
              {student && (
                <p
                  className={`text-xs font-mono ${
                    isStudentView ? 'text-emerald-400/90 font-bold' : 'text-slate-500'
                  }`}
                >
                  Roll: {student.rollNumber}
                </p>
              )}
            </div>

            <button
              onClick={handleLogout}
              className={`p-2 rounded-lg transition ${
                isStudentView
                  ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                  : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
              }`}
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile bottom nav for students */}
      {user.role === 'STUDENT' && (
        <div
          className={`md:hidden border-t px-4 py-2 flex justify-around items-center ${
            isStudentView
              ? 'border-emerald-500/20 bg-[#050b07]/95 backdrop-blur text-slate-400'
              : 'border-slate-200 bg-white'
          }`}
        >
          <Link
            to="/student/dashboard"
            className={`flex flex-col items-center py-1 px-3 text-xs font-medium rounded-lg ${
              isActive('/student/dashboard')
                ? isStudentView ? 'text-emerald-400 font-bold font-mono' : 'text-indigo-600'
                : isStudentView ? 'text-slate-400 hover:text-emerald-300' : 'text-slate-500'
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            Dashboard
          </Link>
          <Link
            to="/student/scan"
            className={`flex flex-col items-center py-1 px-3 text-xs font-medium rounded-lg ${
              isActive('/student/scan')
                ? isStudentView ? 'text-yellow-400 font-bold font-mono' : 'text-indigo-600 font-bold'
                : isStudentView ? 'text-slate-400 hover:text-yellow-300' : 'text-slate-500'
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
