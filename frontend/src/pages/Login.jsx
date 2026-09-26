import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bus, Lock, Mail, AlertCircle, Eye, EyeOff, Phone, PhoneCall, X } from 'lucide-react';
import { getCurrentPosition, saveCachedPosition } from '../utils/geolocation';

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

  // Pre-warm and obtain current GPS location in background when user opens login page
  useEffect(() => {
    getCurrentPosition({ timeout: 5000, maximumAge: 60000, enableHighAccuracy: true })
      .then((pos) => {
        if (pos) saveCachedPosition(pos);
      })
      .catch(() => {
        // Silently ignore permission/timeout on initial load
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Fast acquisition of current GPS coordinates to link with login
    let currentGps = null;
    try {
      currentGps = await getCurrentPosition({ timeout: 2500, enableHighAccuracy: true });
    } catch (_) {
      try {
        const raw = localStorage.getItem('smart_bus_last_gps');
        if (raw) currentGps = JSON.parse(raw);
      } catch (e) {}
    }

    try {
      const result = await login(email, password, currentGps);
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
    <div className="min-h-screen flex flex-col justify-center bg-[#040D0A] px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-yellow-400 selection:text-slate-950">
      {/* Bio-Tech Solar Matrix Ambient Glowing Orbs */}
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] bg-yellow-400/18 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
      <div className="absolute -bottom-32 -right-32 w-[540px] h-[540px] bg-emerald-500/22 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] bg-gradient-to-tr from-emerald-600/12 via-yellow-400/8 to-transparent rounded-full blur-[170px] pointer-events-none"></div>

      {/* Cyber-Matrix Tech Grid & Telemetry Dots */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98118_1px,transparent_1px),linear-gradient(to_bottom,#10b98118_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(#facc1515_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none"></div>

      {/* Floating Bio-Tech Telemetry Badges */}
      <div className="absolute top-20 left-8 transform -rotate-12 hidden lg:block pointer-events-none">
        <span className="inline-flex items-center space-x-1.5 bg-[#071912]/90 border border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.35)] px-3.5 py-1.5 rounded-xl text-[11px] font-black text-emerald-300 uppercase tracking-widest backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>✦ SATELLITE GNSS LOCK</span>
        </span>
      </div>
      <div className="absolute bottom-24 left-12 transform rotate-6 hidden lg:block pointer-events-none">
        <span className="inline-block bg-[#1A1605]/90 border border-yellow-400/60 shadow-[0_0_20px_rgba(250,204,21,0.35)] px-3.5 py-1.5 rounded-xl text-[11px] font-black text-yellow-300 uppercase tracking-widest backdrop-blur-md">
          ⚡ SOLAR MATRIX ACTIVE
        </span>
      </div>
      <div className="absolute top-32 right-12 transform rotate-12 hidden lg:block pointer-events-none">
        <span className="inline-block bg-[#0A1813]/90 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)] px-3.5 py-1.5 rounded-xl text-[11px] font-black text-emerald-200 uppercase tracking-widest backdrop-blur-md">
          🚌 VSB FLEET #09
        </span>
      </div>

      {/* Top Corner Quick Contact Button */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <button
          type="button"
          onClick={() => setShowContactModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 hover:from-yellow-300 hover:to-amber-300 text-slate-950 text-xs font-black shadow-[0_0_25px_rgba(250,204,21,0.35)] border-2 border-yellow-300 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Contact Driver & Bus Incharge"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 animate-pulse"></span>
          <PhoneCall className="w-3.5 h-3.5 text-slate-950" />
          <span>Emergency Contacts</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        {/* Real College Bus Logo Badge with Dual Luminous Halo */}
        <div className="mx-auto w-24 h-24 rounded-2xl overflow-hidden border-2 border-yellow-400 shadow-[0_0_35px_rgba(250,204,21,0.45)] ring-4 ring-emerald-500/40 mb-4 transform hover:scale-105 transition-all duration-300 bg-[#071912] flex items-center justify-center">
          <img
            src="/bus-logo.jpg"
            alt="VSB Institutions Bus 09"
            className="w-full h-full object-cover object-center"
          />
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          <span className="bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(250,204,21,0.55)]">Smart</span>
          <span className="text-white">Bus </span>
          <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(52,211,153,0.45)]">Attendance</span>
        </h2>
        <div className="mt-2.5 flex items-center justify-center space-x-2.5">
          <span className="px-3.5 py-1 rounded-xl text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-[0_0_15px_rgba(52,211,153,0.3)] uppercase tracking-wider">
            BUS NO 09
          </span>
          <span className="px-3.5 py-1 rounded-xl text-xs font-black bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.3)] uppercase tracking-wider">
            VSB Institutions
          </span>
        </div>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-[#081712]/92 backdrop-blur-2xl border-2 border-emerald-500/40 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(16,185,129,0.18)] rounded-3xl p-6 sm:p-9 relative overflow-hidden ring-1 ring-yellow-400/25">
          {/* Top Luminous Neon Solar Beam Line */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-400 via-yellow-300 to-emerald-400 shadow-[0_0_22px_rgba(250,204,21,0.7)]"></div>

          {/* Card Subtitle Matrix Bar */}
          <div className="bg-[#040E0A]/95 border-b border-emerald-500/25 -mx-6 sm:-mx-9 -mt-6 sm:-mt-9 px-6 sm:px-9 py-3.5 mb-6 flex items-center justify-center">
            <span className="font-black text-xs uppercase tracking-wider text-yellow-400 flex items-center space-x-1.5">
              <span className="text-emerald-400">⚡</span>
              <span>Student & Staff Portal</span>
            </span>
          </div>

          <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 bg-rose-950/70 border-2 border-rose-500/70 rounded-2xl text-xs font-bold text-rose-300 flex items-center space-x-2 shadow-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/90 mb-1.5">
                Student Name / Username / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. Kowshiek or Hari"
                  className="block w-full pl-10 pr-4 py-3 bg-[#030B08] border-2 border-emerald-950/80 text-white placeholder-emerald-800/60 rounded-2xl text-sm font-semibold shadow-inner focus:bg-[#05110D] focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/35 focus:shadow-[0_0_20px_rgba(250,204,21,0.2)] focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/90">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-3 bg-[#030B08] border-2 border-emerald-950/80 text-white placeholder-emerald-800/60 rounded-2xl text-sm font-semibold shadow-inner focus:bg-[#05110D] focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/35 focus:shadow-[0_0_20px_rgba(250,204,21,0.2)] focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-emerald-500 hover:text-yellow-400 transition focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 rounded-2xl text-sm font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 hover:from-yellow-300 hover:to-amber-300 shadow-[0_0_30px_rgba(250,204,21,0.4)] border-2 border-yellow-300 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Sign In to Dashboard →'
              )}
            </button>
          </form>
        </div>

        {/* Developer Attribution Watermark (Bio-Tech Solar Matrix Badge) */}
        <div className="mt-8 text-center">
          <div className="inline-block bg-[#071711]/92 border border-emerald-500/40 shadow-xl shadow-black/90 rounded-2xl px-6 py-3.5 text-center backdrop-blur-md ring-1 ring-yellow-400/15">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              Developed and Maintained by
            </p>
            <p className="text-sm sm:text-base font-black text-yellow-300 tracking-wide mt-0.5 drop-shadow-[0_0_12px_rgba(250,204,21,0.35)]">
              Kowshiek R
            </p>
            <p className="text-xs text-emerald-200/70 font-semibold mt-0.5">
              Department of IT
            </p>
          </div>
        </div>
      </div>

      {/* Contact Modal showing Driver & Bus Incharge numbers (Bio-Tech Solar Matrix Mode) */}
      {showContactModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020705]/85 backdrop-blur-md"
          onClick={() => setShowContactModal(false)}
        >
          <div
            className="bg-[#071711] rounded-3xl border-2 border-yellow-400 shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_30px_rgba(250,204,21,0.2)] max-w-sm w-full p-6 relative overflow-hidden text-white animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent bar */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 via-yellow-400 to-emerald-500 shadow-[0_0_15px_rgba(250,204,21,0.5)]"></div>

            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowContactModal(false)}
              className="absolute top-5 right-4 p-1.5 rounded-xl bg-[#0B2119] hover:bg-[#0E2C22] text-emerald-300 hover:text-white border border-emerald-500/40 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4 font-black" />
            </button>

            {/* Header */}
            <div className="flex items-center space-x-3 mb-5 mt-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-400 to-amber-300 border border-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.35)] flex items-center justify-center text-slate-950 flex-shrink-0">
                <PhoneCall className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <h3 className="text-base font-black text-white leading-tight">
                  Emergency Contacts
                </h3>
                <p className="text-xs text-emerald-300/80 font-medium">
                  Bus No. 09 • VSB Institutions
                </p>
              </div>
            </div>

            {/* Contact cards with one-tap dialing */}
            <div className="space-y-3">
              {/* Driver Contact */}
              <div className="p-3.5 rounded-2xl bg-[#040E0A] border border-emerald-500/40 hover:border-emerald-400 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-emerald-400/80 uppercase tracking-wider">
                      Driver (Anand)
                    </p>
                    <p className="text-lg font-black text-emerald-300 font-mono tracking-tight mt-0.5">
                      9786123098
                    </p>
                  </div>
                  <a
                    href="tel:9786123098"
                    className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95 transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                </div>
              </div>

              {/* Bus Incharge Contact */}
              <div className="p-3.5 rounded-2xl bg-[#040E0A] border border-yellow-400/40 hover:border-yellow-300 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-yellow-400/80 uppercase tracking-wider">
                      Bus Incharge
                    </p>
                    <p className="text-lg font-black text-yellow-300 font-mono tracking-tight mt-0.5">
                      9787842578
                    </p>
                  </div>
                  <a
                    href="tel:9787842578"
                    className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black shadow-[0_0_15px_rgba(250,204,21,0.4)] active:scale-95 transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                </div>
              </div>

              {/* Admin Contact (Number Protected & Hidden) */}
              <div className="p-3.5 rounded-2xl bg-[#040E0A] border border-purple-500/40 hover:border-purple-400 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <p className="text-[11px] font-bold text-purple-300/80 uppercase tracking-wider">
                        Admin
                      </p>
                      <span className="text-[10px] px-1.5 py-0.2 bg-purple-900/60 border border-purple-500 text-purple-300 font-bold rounded-md">
                        Protected
                      </span>
                    </div>
                    <p className="text-base font-black text-slate-500 font-mono tracking-widest mt-0.5">
                      ••••••••••
                    </p>
                  </div>
                  <a
                    href="tel:9789400940"
                    className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-md shadow-purple-600/20 active:scale-95 transition"
                    title="Direct Call to Admin"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Admin</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Prompt requested text block */}
            <div className="mt-4 p-3 rounded-2xl bg-[#030A07] border border-emerald-500/30 text-xs text-slate-300 font-mono leading-relaxed text-center shadow-inner">
              <div><strong className="text-emerald-400">Driver Number:</strong> 9786123098</div>
              <div><strong className="text-yellow-400">Bus Incharge:</strong> 9787842578</div>
              <div className="text-purple-400 font-bold mt-0.5">
                <strong>Admin:</strong> •••••••••• (Click Call Admin)
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowContactModal(false)}
              className="mt-4 w-full py-2.5 rounded-2xl bg-[#0A1E16] hover:bg-[#0D281E] border border-emerald-500/30 text-white text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
