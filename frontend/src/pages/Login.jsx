import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  Phone,
  PhoneCall,
  X,
  Radio,
  Activity,
  Navigation,
  ShieldCheck,
  Zap,
} from 'lucide-react';

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
        setError(result.message || 'Access Denied: Invalid identification credentials.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Access Denied: Invalid identification credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-[#050b07] text-slate-100 px-4 py-10 sm:px-6 lg:px-8 relative overflow-hidden font-sans select-none">
      {/* ========================================================================= */}
      {/* CYBERPUNK IOT & RADAR HUD BACKGROUND INFRASTRUCTURE                       */}
      {/* ========================================================================= */}

      {/* Cyber ambient glow orbs: Emerald Green & Solar Yellow */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-yellow-400/12 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-400/8 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Futuristic Cyber Coordinate Grid Matrix */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #10b981 1px, transparent 1px),
            linear-gradient(to bottom, #10b981 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      ></div>

      {/* Concentric Radar HUD Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="w-[380px] h-[380px] sm:w-[540px] sm:h-[540px] rounded-full border border-emerald-500/15 animate-pulse"></div>
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="w-[600px] h-[600px] sm:w-[840px] sm:h-[840px] rounded-full border border-dashed border-yellow-400/10"></div>
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="w-[850px] h-[850px] sm:w-[1150px] sm:h-[1150px] rounded-full border border-emerald-500/10"></div>
      </div>

      {/* Radar HUD Crosshairs */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-15">
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent"></div>
        <div className="h-full w-[1px] bg-gradient-to-b from-transparent via-yellow-400 to-transparent absolute"></div>
      </div>

      {/* ========================================================================= */}
      {/* TOP TELEMETRY STATUS BAR & EMERGENCY ACTION                               */}
      {/* ========================================================================= */}
      <div className="absolute top-4 inset-x-4 sm:top-6 sm:inset-x-8 flex items-center justify-between z-20 pointer-events-auto">
        {/* Radar Telemetry Signal Beacon */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#0a150e]/90 border border-emerald-500/40 text-emerald-300 text-[10px] sm:text-xs font-mono shadow-[0_0_20px_rgba(16,185,129,0.25)] backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <span className="font-bold tracking-wider text-emerald-300">RADAR: LIVE</span>
          <span className="text-emerald-600">|</span>
          <span className="text-yellow-400 font-semibold hidden xs:inline">BUS-09 TELEMETRY</span>
        </div>

        {/* Cyber Emergency Contact Trigger */}
        <button
          type="button"
          onClick={() => setShowContactModal(true)}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#0f1a12]/90 hover:bg-yellow-400 hover:text-slate-950 text-yellow-300 text-xs font-mono font-bold tracking-wide border border-yellow-400/50 shadow-[0_0_20px_rgba(250,204,21,0.25)] hover:shadow-[0_0_25px_rgba(250,204,21,0.5)] transition duration-200 active:scale-95 cursor-pointer backdrop-blur-md group"
          title="Open Bus Emergency Contacts"
        >
          <PhoneCall className="w-3.5 h-3.5 text-yellow-400 group-hover:text-slate-950 transition" />
          <span>CONTACT [SOS]</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* BRAND & FLEET IDENTITY HERO                                               */}
      {/* ========================================================================= */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 mt-6 sm:mt-0">
        {/* Real College Bus Logo with Cyber Shield Frame */}
        <div className="relative mx-auto w-24 h-24 mb-4">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 to-yellow-400 rounded-3xl blur-md opacity-70 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
          <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl border-2 border-emerald-400 bg-black/80 flex items-center justify-center ring-2 ring-yellow-400/40">
            <img
              src="/bus-logo.jpg"
              alt="VSB Institutions Bus 09"
              className="w-full h-full object-cover object-center"
            />
          </div>
          {/* Cyber Corner HUD Accent Nodes */}
          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-yellow-400"></div>
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-emerald-400"></div>
          <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-emerald-400"></div>
          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-yellow-400"></div>
        </div>

        {/* Title in Cyberpunk Green & Yellow */}
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
          <span className="text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">SMART</span>
          <span className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">BUS</span>
          <span className="text-xs font-mono font-bold ml-2 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-400/40 text-emerald-300">
            IoT HUD
          </span>
        </h2>

        {/* Telemetry Sub-header Badges */}
        <div className="mt-2 flex items-center justify-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-black bg-yellow-400 text-slate-950 shadow-[0_0_15px_rgba(250,204,21,0.4)] tracking-wider">
            FLEET // BUS NO 09
          </span>
          <span className="text-xs font-mono font-semibold text-emerald-400/80 tracking-wide">
            VSB INSTITUTIONS
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CYBERPUNK HUD AUTHENTICATION CARD                                         */}
      {/* ========================================================================= */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="backdrop-blur-2xl bg-[#09140d]/85 py-8 px-6 shadow-[0_0_50px_-10px_rgba(16,185,129,0.3)] rounded-3xl sm:px-10 border border-emerald-500/30 ring-1 ring-yellow-400/20 relative overflow-hidden">
          {/* Top Neon Scanner Beam */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-yellow-400 to-emerald-500 shadow-[0_0_15px_#10b981]"></div>

          {/* Micro HUD Corner Markers */}
          <span className="absolute top-2 left-3 text-[9px] font-mono text-emerald-500/40 select-none">
            ┌─ SYS.AUTH
          </span>
          <span className="absolute top-2 right-3 text-[9px] font-mono text-yellow-500/40 select-none">
            SEC.LEVEL-01 ─┐
          </span>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Error Notification HUD */}
            {error && (
              <div className="p-3.5 bg-rose-950/50 border border-rose-500/50 rounded-xl text-xs font-mono text-rose-300 flex items-center space-x-2 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 animate-pulse" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {/* Universal Identifier Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-300">
                  // Student / User ID
                </label>
                <span className="text-[10px] font-mono text-yellow-400/80">
                  [ Roll No / Email ]
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. Kowshiek, Hari, or 23CS001"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-black/60 border border-emerald-500/30 rounded-xl text-sm font-mono text-emerald-100 placeholder-emerald-700/60 focus:bg-black/80 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/60 shadow-inner transition duration-200"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-300">
                  // Security Access Key
                </label>
                <span className="text-[10px] font-mono text-emerald-500/80">
                  [ Password ]
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 bg-black/60 border border-emerald-500/30 rounded-xl text-sm font-mono text-emerald-100 placeholder-emerald-700/60 focus:bg-black/80 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/60 shadow-inner transition duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-emerald-500 hover:text-yellow-400 transition focus:outline-none cursor-pointer"
                  title={showPassword ? 'Hide Key' : 'Reveal Key'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Cyberpunk High-Energy Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:shadow-[0_0_35px_rgba(250,204,21,0.55)] text-sm font-mono font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-emerald-400 via-green-300 to-yellow-400 hover:from-emerald-300 hover:to-yellow-300 active:scale-[0.98] border border-yellow-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-yellow-400 transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>AUTHENTICATING TELEMETRY...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 fill-current" />
                  <span>INITIALIZE HUD SESSION</span>
                </div>
              )}
            </button>
          </form>

          {/* Bottom Card Micro Indicators */}
          <div className="mt-5 pt-3 border-t border-emerald-500/20 flex items-center justify-between text-[10px] font-mono text-emerald-500/70">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>GEOFENCE 100M SECURE</span>
            </div>
            <div className="flex items-center space-x-1.5 text-yellow-400/80">
              <Activity className="w-3.5 h-3.5" />
              <span>DYNAMIC QR TOKEN</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DEVELOPER ATTRIBUTION WATERMARK                                           */}
        {/* ========================================================================= */}
        <div className="mt-6 text-center pt-4 border-t border-emerald-900/40">
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400/70">
            [ SYSTEM ARCHITECT & TELEMETRY MAINTAINER ]
          </p>
          <p className="text-sm font-mono font-black text-yellow-300 tracking-wider mt-0.5 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]">
            KOWSHIEK R
          </p>
          <p className="text-xs font-mono font-semibold text-emerald-400 mt-0.5">
            DEPARTMENT OF INFORMATION TECHNOLOGY
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CYBERPUNK HUD EMERGENCY CONTACT MODAL                                     */}
      {/* ========================================================================= */}
      {showContactModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setShowContactModal(false)}
        >
          <div
            className="backdrop-blur-2xl bg-[#0a160f]/95 rounded-3xl shadow-[0_0_60px_rgba(16,185,129,0.3)] border-2 border-yellow-400 max-w-sm w-full p-6 relative overflow-hidden text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent scanner bar */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 via-yellow-400 to-emerald-500 shadow-[0_0_15px_#eab308]"></div>

            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-emerald-400 hover:text-yellow-400 hover:bg-emerald-950/60 border border-emerald-500/20 transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center space-x-3 mb-5 mt-1">
              <div className="w-11 h-11 rounded-2xl bg-yellow-400/10 border border-yellow-400/40 flex items-center justify-center text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.2)] flex-shrink-0">
                <PhoneCall className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-base font-black font-mono text-white tracking-wide">
                  BUS EMERGENCY COMMS
                </h3>
                <p className="text-xs font-mono text-emerald-400/80">
                  ROUTE 09 // VSB INSTITUTIONS
                </p>
              </div>
            </div>

            {/* Contact cards with one-tap dialing */}
            <div className="space-y-3">
              {/* Driver Contact */}
              <div className="p-3.5 rounded-2xl bg-black/50 border border-emerald-500/30 hover:border-emerald-400 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                      // Driver Comms
                    </p>
                    <p className="text-base font-black text-white font-mono tracking-tight mt-0.5">
                      9786123098
                    </p>
                  </div>
                  <a
                    href="tel:9786123098"
                    className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-black shadow-[0_0_15px_rgba(16,185,129,0.35)] transition active:scale-95"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>DIAL</span>
                  </a>
                </div>
              </div>

              {/* Bus Incharge Contact */}
              <div className="p-3.5 rounded-2xl bg-black/50 border border-yellow-400/40 hover:border-yellow-400 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono font-bold text-yellow-400 uppercase tracking-wider">
                      // Bus Incharge
                    </p>
                    <p className="text-base font-black text-white font-mono tracking-tight mt-0.5">
                      9787842578
                    </p>
                  </div>
                  <a
                    href="tel:9787842578"
                    className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-mono font-black shadow-[0_0_15px_rgba(250,204,21,0.35)] transition active:scale-95"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>DIAL</span>
                  </a>
                </div>
              </div>

              {/* Admin Contact (Number Protected & Hidden) */}
              <div className="p-3.5 rounded-2xl bg-black/50 border border-purple-500/30 hover:border-purple-400 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <p className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider">
                        // Admin Priority
                      </p>
                      <span className="text-[9px] px-1.5 py-0.2 bg-purple-950 text-purple-300 border border-purple-500/30 font-bold rounded-full">
                        PROTECTED
                      </span>
                    </div>
                    <p className="text-sm font-black text-slate-400 font-mono tracking-widest mt-0.5">
                      ••••••••••
                    </p>
                  </div>
                  <a
                    href="tel:9789400940"
                    className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-black shadow-[0_0_15px_rgba(168,85,247,0.35)] transition active:scale-95"
                    title="Direct Call to Admin"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>CALL ADMIN</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Quick summary telemetry readout */}
            <div className="mt-4 p-3 rounded-xl bg-black/60 border border-emerald-500/20 text-xs font-mono leading-relaxed text-center text-emerald-300">
              <div><strong className="text-yellow-400">Driver:</strong> 9786123098</div>
              <div><strong className="text-yellow-400">Incharge:</strong> 9787842578</div>
              <div className="text-purple-300 font-semibold mt-0.5">
                <strong>Admin:</strong> •••••••••• (Click Call Admin)
              </div>
            </div>

            {/* Dismiss button */}
            <button
              type="button"
              onClick={() => setShowContactModal(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold transition cursor-pointer"
            >
              [ CLOSE COMM INTERFACE ]
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
