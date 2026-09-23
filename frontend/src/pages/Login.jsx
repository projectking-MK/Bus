import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bus, Lock, Mail, AlertCircle, Eye, EyeOff, Phone, PhoneCall, X } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col justify-center bg-[#FFFDF5] px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-yellow-400 selection:text-slate-950">
      {/* Neo-Brutalist Geometric Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a12_1px,transparent_1px),linear-gradient(to_bottom,#0f172a12_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none"></div>

      {/* Decorative Neo-Brutalist Floating Shapes & Stickers */}
      <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full border-[3px] border-slate-900 bg-yellow-300 shadow-[6px_6px_0px_0px_#0f172a] pointer-events-none hidden sm:block"></div>
      <div className="absolute -bottom-16 -right-16 w-60 h-60 rounded-3xl border-[3px] border-slate-900 bg-emerald-300 shadow-[8px_8px_0px_0px_#0f172a] transform rotate-12 pointer-events-none hidden sm:block"></div>
      
      {/* Floating Decorative Neo-Stickers */}
      <div className="absolute top-20 left-8 transform -rotate-12 hidden lg:block pointer-events-none">
        <span className="inline-block bg-emerald-400 border-[2.5px] border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] px-3.5 py-1 rounded-xl text-xs font-black text-slate-950 uppercase tracking-wider">
          ✦ Live GPS Route
        </span>
      </div>
      <div className="absolute bottom-24 left-12 transform rotate-6 hidden lg:block pointer-events-none">
        <span className="inline-block bg-yellow-300 border-[2.5px] border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] px-3.5 py-1 rounded-xl text-xs font-black text-slate-950 uppercase tracking-wider">
          ⚡ 100% Anti-Proxy
        </span>
      </div>
      <div className="absolute top-32 right-12 transform rotate-12 hidden lg:block pointer-events-none">
        <span className="inline-block bg-white border-[2.5px] border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] px-3.5 py-1 rounded-xl text-xs font-black text-slate-950 uppercase tracking-wider">
          🚌 Campus Transit
        </span>
      </div>

      {/* Top Corner Quick Contact Button */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <button
          type="button"
          onClick={() => setShowContactModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black border-[2.5px] border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#0f172a] transition-all cursor-pointer"
          title="Contact Driver & Bus Incharge"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 border border-slate-900 animate-pulse"></span>
          <PhoneCall className="w-3.5 h-3.5 text-slate-950" />
          <span>Emergency Contacts</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        {/* Real College Bus Logo Badge with Neo-Brutalist Frame */}
        <div className="mx-auto w-24 h-24 rounded-2xl overflow-hidden border-[3.5px] border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] mb-4 transform -rotate-2 hover:rotate-0 transition-transform duration-300 bg-yellow-200 flex items-center justify-center">
          <img
            src="/bus-logo.jpg"
            alt="VSB Institutions Bus 09"
            className="w-full h-full object-cover object-center"
          />
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          <span className="inline-block bg-yellow-400 px-2 py-0.5 border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] rounded-xl -rotate-1 mr-1">Smart</span>Bus Attendance
        </h2>
        <div className="mt-2.5 flex items-center justify-center space-x-2.5">
          <span className="px-3.5 py-1 rounded-xl text-xs font-black bg-emerald-400 text-slate-950 border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] uppercase tracking-wider">
            BUS NO 09
          </span>
          <span className="px-3.5 py-1 rounded-xl text-xs font-black bg-yellow-300 text-slate-950 border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] uppercase tracking-wider">
            VSB Institutions
          </span>
        </div>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white border-[3.5px] border-slate-900 rounded-3xl shadow-[8px_8px_0px_0px_#0f172a] p-6 sm:p-9 relative overflow-hidden">
          {/* Card Sticker Header Banner */}
          <div className="bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 border-b-[3px] border-slate-900 -mx-6 sm:-mx-9 -mt-6 sm:-mt-9 px-6 sm:px-9 py-3.5 mb-6 flex items-center justify-between">
            <span className="font-black text-xs uppercase tracking-wider text-slate-950 flex items-center space-x-1.5">
              <span>⚡</span>
              <span>Student & Staff Portal</span>
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-400 border-2 border-slate-900 rounded-lg text-[10px] font-black uppercase text-slate-950 shadow-[2px_2px_0px_0px_#0f172a]">
              Active
            </span>
          </div>

          <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 bg-rose-100 border-2 border-slate-900 rounded-2xl text-xs font-bold text-rose-950 flex items-center space-x-2 shadow-[3px_3px_0px_0px_#0f172a]">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-700" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-900 mb-1.5">
                Student Name / Username / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-900">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. Kowshiek or Hari"
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-900 rounded-2xl text-sm font-semibold text-slate-900 placeholder-slate-400 shadow-[3px_3px_0px_0px_#0f172a] focus:bg-white focus:outline-none focus:border-emerald-600 focus:shadow-[4px_4px_0px_0px_#059669] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-900">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-900">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-3 bg-slate-50 border-2 border-slate-900 rounded-2xl text-sm font-semibold text-slate-900 placeholder-slate-400 shadow-[3px_3px_0px_0px_#0f172a] focus:bg-white focus:outline-none focus:border-emerald-600 focus:shadow-[4px_4px_0px_0px_#059669] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-600 hover:text-slate-950 transition focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 rounded-2xl text-sm font-black uppercase tracking-wider text-slate-950 bg-emerald-400 hover:bg-emerald-300 border-[3px] border-slate-900 shadow-[5px_5px_0px_0px_#0f172a] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#0f172a] transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Sign In to Dashboard →'
              )}
            </button>
          </form>
        </div>

        {/* Developer Attribution Watermark (Neo-Brutalist Sticker Badge) */}
        <div className="mt-8 text-center">
          <div className="inline-block bg-slate-900 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#facc15] rounded-2xl px-5 py-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              Developed and Maintained by
            </p>
            <p className="text-sm sm:text-base font-black text-yellow-300 tracking-wide mt-0.5">
              Kowshiek R
            </p>
            <p className="text-xs text-white font-bold mt-0.5">
              Department of IT
            </p>
          </div>
        </div>
      </div>

      {/* Contact Modal showing Driver & Bus Incharge numbers (Neo-Brutalist) */}
      {showContactModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          onClick={() => setShowContactModal(false)}
        >
          <div
            className="bg-white rounded-3xl border-[3.5px] border-slate-900 shadow-[10px_10px_0px_0px_#0f172a] max-w-sm w-full p-6 relative overflow-hidden text-slate-900 animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent bar */}
            <div className="absolute top-0 inset-x-0 h-3 bg-yellow-400 border-b-2 border-slate-900"></div>

            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowContactModal(false)}
              className="absolute top-5 right-4 p-1 rounded-xl bg-slate-100 hover:bg-yellow-400 border-2 border-slate-900 text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transition active:scale-95 cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4 font-black" />
            </button>

            {/* Header */}
            <div className="flex items-center space-x-3 mb-5 mt-2">
              <div className="w-12 h-12 rounded-2xl bg-yellow-300 border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] flex items-center justify-center text-slate-950 flex-shrink-0">
                <PhoneCall className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  Emergency Contacts
                </h3>
                <p className="text-xs text-slate-600 font-bold">
                  Bus No. 09 • VSB Institutions
                </p>
              </div>
            </div>

            {/* Contact cards with one-tap dialing */}
            <div className="space-y-3">
              {/* Driver Contact */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] hover:bg-emerald-100 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                      Driver (Anand)
                    </p>
                    <p className="text-lg font-black text-slate-900 font-mono tracking-tight mt-0.5">
                      9786123098
                    </p>
                  </div>
                  <a
                    href="tel:9786123098"
                    className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                </div>
              </div>

              {/* Bus Incharge Contact */}
              <div className="p-3.5 rounded-2xl bg-yellow-50 border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] hover:bg-yellow-100 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                      Bus Incharge
                    </p>
                    <p className="text-lg font-black text-slate-900 font-mono tracking-tight mt-0.5">
                      9787842578
                    </p>
                  </div>
                  <a
                    href="tel:9787842578"
                    className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                </div>
              </div>

              {/* Admin Contact (Number Protected & Hidden) */}
              <div className="p-3.5 rounded-2xl bg-purple-50 border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] hover:bg-purple-100 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <p className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                        Admin
                      </p>
                      <span className="text-[10px] px-1.5 py-0.2 bg-purple-200 border border-slate-900 text-purple-900 font-black rounded-md">
                        Protected
                      </span>
                    </div>
                    <p className="text-base font-black text-slate-400 font-mono tracking-widest mt-0.5">
                      ••••••••••
                    </p>
                  </div>
                  <a
                    href="tel:9789400940"
                    className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-xs font-black border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition"
                    title="Direct Call to Admin"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Admin</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Prompt requested text block */}
            <div className="mt-4 p-3 rounded-2xl bg-amber-50 border-2 border-slate-900 text-xs text-slate-900 font-mono leading-relaxed text-center shadow-[2px_2px_0px_0px_#0f172a]">
              <div><strong>Driver Number:</strong> 9786123098</div>
              <div><strong>Bus Incharge:</strong> 9787842578</div>
              <div className="text-purple-900 font-bold mt-0.5">
                <strong>Admin:</strong> •••••••••• (Click Call Admin)
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowContactModal(false)}
              className="mt-4 w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 text-slate-900 text-xs font-black shadow-[3px_3px_0px_0px_#0f172a] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
