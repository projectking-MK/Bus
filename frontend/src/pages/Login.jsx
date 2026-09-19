import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bus, Lock, Mail, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { user, login } = useAuth();
  const navigate = useNavigate();

  // If driver logged in once, always continue from the driver page, never stay on login page
  const token = localStorage.getItem('smart_bus_auth_token');
  const isDriverSession = localStorage.getItem('smart_bus_driver_session') === 'true';

  if (token && (isDriverSession || user?.role === 'DRIVER')) {
    return <Navigate to="/driver/dashboard" replace />;
  }

  useEffect(() => {
    if (token && (isDriverSession || user?.role === 'DRIVER')) {
      navigate('/driver/dashboard', { replace: true });
    }
  }, [user, navigate, token, isDriverSession]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        const role = result.user.role;
        if (role === 'ADMIN') navigate('/admin/dashboard');
        else if (role === 'DRIVER') navigate('/driver/dashboard');
        else navigate('/student/dashboard');
      } else {
        setError(result.message || 'Invalid email or password.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gradient-to-br from-emerald-950 via-green-900 to-emerald-950 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative ambient glowing orbs */}
      <div className="absolute -top-28 -left-28 w-96 h-96 bg-yellow-400/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-28 -right-28 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        {/* Logo Badge in Green and Yellow */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-green-500 to-yellow-400 flex items-center justify-center text-emerald-950 shadow-xl shadow-yellow-500/25 border-2 border-yellow-300/60 mb-4 transform hover:scale-105 transition">
          <Bus className="w-9 h-9 text-slate-950" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          <span className="text-yellow-400">Smart</span>Bus Attendance
        </h2>
        <div className="mt-1 flex items-center justify-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
            BUS NO 09
          </span>
          <span className="text-xs text-emerald-200">
            55 Registered Students System
          </span>
        </div>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border-t-4 border-t-yellow-400 border-x border-b border-emerald-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Student Name / Username / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. Kowshiek or Hari"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-emerald-700 transition focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Hint Card in Green and Yellow */}
              <div className="mt-2.5 p-2.5 rounded-xl bg-gradient-to-r from-yellow-50/80 to-emerald-50/80 border border-yellow-200/90 text-[11px] text-slate-600 leading-relaxed">
                <span className="font-bold text-emerald-900">Student Password:</span> name (lowercase) + Department (uppercase), e.g.{' '}
                <span className="font-bold text-emerald-700 bg-yellow-100/70 px-1.5 py-0.5 rounded border border-yellow-300/60 font-mono">
                  kowshiekIT
                </span>
                ,{' '}
                <span className="font-bold text-emerald-700 bg-yellow-100/70 px-1.5 py-0.5 rounded border border-yellow-300/60 font-mono">
                  hariECE
                </span>
                .
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-700/25 text-sm font-bold text-slate-950 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 hover:from-yellow-300 hover:to-amber-400 active:scale-[0.98] border border-yellow-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>
        </div>

        {/* Security badges in Green and Yellow */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-emerald-200/90">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
            <span>Hardware Device Binding</span>
          </span>
          <span className="text-yellow-400/60">•</span>
          <span>Dynamic QR Attendance</span>
          <span className="text-yellow-400/60">•</span>
          <span>GPS Geofencing</span>
        </div>
      </div>
    </div>
  );
};
