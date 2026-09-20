import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bus, Lock, Mail, AlertCircle, ShieldCheck, Eye, EyeOff, Phone, PhoneCall, X } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
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

      {/* Top Corner Quick Contact Button */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <button
          type="button"
          onClick={() => setShowContactModal(true)}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black shadow-lg shadow-yellow-500/20 border border-yellow-300 transition active:scale-95 cursor-pointer"
          title="Contact Driver & Bus Incharge"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Contact</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        {/* Real College Bus Logo Badge */}
        <div className="mx-auto w-24 h-24 rounded-3xl overflow-hidden shadow-2xl shadow-yellow-500/30 border-4 border-yellow-400 mb-4 transform hover:scale-105 transition bg-yellow-100 flex items-center justify-center ring-4 ring-emerald-400/30">
          <img
            src="/bus-logo.jpg"
            alt="VSB Institutions Bus 09"
            className="w-full h-full object-cover object-center"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          <span className="text-yellow-400">Smart</span>Bus Attendance
        </h2>
        <div className="mt-1 flex items-center justify-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-yellow-400 text-slate-950 shadow-sm">
            BUS NO 09
          </span>
          <span className="text-xs text-emerald-200 font-semibold">
            VSB Institutions • 55 Students System
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

        {/* Developer Attribution Watermark */}
        <div className="mt-8 text-center pt-5 border-t border-emerald-800/40">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-yellow-400/85">
            Developed and Maintained by
          </p>
          <p className="text-sm sm:text-base font-black text-yellow-300 tracking-wide mt-0.5">
            Kowshiek R
          </p>
          <p className="text-sm sm:text-base text-yellow-400 font-bold mt-0.5">
            Department of IT
          </p>
        </div>
      </div>

      {/* Contact Modal showing Driver & Bus Incharge numbers */}
      {showContactModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
          onClick={() => setShowContactModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border-2 border-yellow-400 max-w-sm w-full p-6 relative overflow-hidden text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent gradient bar */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-600 via-yellow-400 to-emerald-600"></div>

            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center space-x-3 mb-5 mt-1">
              <div className="w-11 h-11 rounded-2xl bg-yellow-100 border border-yellow-300 flex items-center justify-center text-slate-900 shadow-sm flex-shrink-0">
                <PhoneCall className="w-5 h-5 text-emerald-800" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  Bus Emergency Contacts
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Bus No. 09 • VSB Institutions
                </p>
              </div>
            </div>

            {/* Contact cards with one-tap dialing */}
            <div className="space-y-3">
              {/* Driver Contact */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Driver Number
                    </p>
                    <p className="text-lg font-black text-slate-900 font-mono tracking-tight mt-0.5">
                      9786123098
                    </p>
                  </div>
                  <a
                    href="tel:9786123098"
                    className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition active:scale-95"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                </div>
              </div>

              {/* Bus Incharge Contact */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-yellow-400 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Bus Incharge
                    </p>
                    <p className="text-lg font-black text-slate-900 font-mono tracking-tight mt-0.5">
                      9787842578
                    </p>
                  </div>
                  <a
                    href="tel:9787842578"
                    className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-bold shadow-sm transition active:scale-95 border border-yellow-300"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Exact prompt requested text block */}
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200/90 text-xs text-emerald-950 font-mono leading-relaxed text-center">
              <div><strong>Driver Number:</strong> 9786123098</div>
              <div><strong>Bus Incharge:</strong> 9787842578</div>
            </div>

            {/* Dismiss button */}
            <button
              type="button"
              onClick={() => setShowContactModal(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
