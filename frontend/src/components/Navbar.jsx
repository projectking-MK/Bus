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
    <header className="sticky top-0 z-40 bg-[#040806]/95 backdrop-blur-xl border-b border-emerald-500/30 shadow-lg text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md shadow-yellow-500/20 border-2 border-yellow-400 flex items-center justify-center bg-[#071911] flex-shrink-0">
              <img
                src="/bus-logo.jpg"
                alt="VSB Institutions Bus 09"
                className="w-full h-full object-cover object-center"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-white tracking-tight text-lg">
                  <span className="bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-400 bg-clip-text text-transparent">Smart</span>Bus
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-black bg-yellow-400 text-slate-950 shadow-[0_0_12px_rgba(250,204,21,0.4)]">
                  BUS-09
                </span>
              </div>
              <p className="text-xs text-emerald-400/80 hidden sm:block font-medium">VSB Institutions • Bus Attendance</p>
            </div>
          </div>

          {/* Navigation links based on role */}
          <nav className="hidden md:flex items-center space-x-1">
            {user.role === 'ADMIN' && (
              <>
                <Link
                  to="/admin/dashboard"
                  className={`px-3 py-2 rounded-xl text-sm font-bold transition ${
                    isActive('/admin/dashboard')
                      ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40'
                      : 'text-emerald-200/80 hover:text-white hover:bg-emerald-950/60'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/students"
                  className={`px-3 py-2 rounded-xl text-sm font-bold transition flex items-center space-x-1.5 ${
                    isActive('/admin/students')
                      ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40'
                      : 'text-emerald-200/80 hover:text-white hover:bg-emerald-950/60'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Students (55)</span>
                </Link>
                <Link
                  to="/admin/attendance"
                  className={`px-3 py-2 rounded-xl text-sm font-bold transition flex items-center space-x-1.5 ${
                    isActive('/admin/attendance')
                      ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40'
                      : 'text-emerald-200/80 hover:text-white hover:bg-emerald-950/60'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Attendance Logs</span>
                </Link>
                <Link
                  to="/admin/trips"
                  className={`px-3 py-2 rounded-xl text-sm font-bold transition flex items-center space-x-1.5 ${
                    isActive('/admin/trips')
                      ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40'
                      : 'text-emerald-200/80 hover:text-white hover:bg-emerald-950/60'
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
                  className={`px-3 py-2 rounded-xl text-sm font-bold transition flex items-center space-x-1.5 ${
                    isActive('/driver/dashboard')
                      ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40'
                      : 'text-emerald-200/80 hover:text-white hover:bg-emerald-950/60'
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
                  className={`px-3 py-2 rounded-xl text-sm font-bold transition ${
                    isActive('/student/dashboard')
                      ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40'
                      : 'text-emerald-200/80 hover:text-white hover:bg-emerald-950/60'
                  }`}
                >
                  Overview
                </Link>
                <Link
                  to="/student/scan"
                  className={`px-3.5 py-1.5 rounded-xl text-sm font-black transition flex items-center space-x-1.5 ${
                    isActive('/student/scan')
                      ? 'bg-gradient-to-r from-yellow-400 via-lime-300 to-yellow-400 text-slate-950 shadow-[0_0_15px_rgba(250,204,21,0.4)] border border-yellow-300'
                      : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/60'
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
                <span className="text-sm font-bold text-white">
                  {user.role === 'ADMIN'
                    ? (user.name && !user.name.includes('Ramanathan') ? user.name : 'R. Kowshiek IT')
                    : user.role === 'DRIVER'
                    ? (user.name && !user.name.includes('Muthuvel') ? user.name : 'Anand')
                    : user.name}
                </span>
                <span
                  className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-lg bg-emerald-950/90 text-yellow-300 border border-emerald-500/40"
                >
                  {user.role}
                </span>
              </div>
              {student && (
                <p className="text-xs text-emerald-300/80 font-mono">
                  Roll: {student.rollNumber}
                </p>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-emerald-400/80 hover:text-rose-400 hover:bg-rose-950/50 rounded-xl transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile bottom nav for students */}
      {user.role === 'STUDENT' && (
        <div className="md:hidden border-t border-emerald-500/30 bg-[#040806] px-4 py-2 flex justify-around items-center">
          <Link
            to="/student/dashboard"
            className={`flex flex-col items-center py-1 px-3 text-xs font-bold rounded-xl ${
              isActive('/student/dashboard') ? 'text-yellow-400' : 'text-emerald-300/70'
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            Dashboard
          </Link>
          <Link
            to="/student/scan"
            className={`flex flex-col items-center py-1 px-3 text-xs font-bold rounded-xl ${
              isActive('/student/scan') ? 'text-yellow-400 font-black' : 'text-emerald-300/70'
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
