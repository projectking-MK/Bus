import React from 'react';
import { useLocation } from 'react-router-dom';

export const Watermark = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <aside
      aria-label="Developer Watermark"
      className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 pointer-events-none select-none"
    >
        <div
          className={`px-3 py-2 rounded-xl backdrop-blur-md shadow-lg border text-right transition-all duration-300 ${
            isLoginPage
              ? 'bg-emerald-950/80 border-yellow-400/30 text-emerald-100 shadow-emerald-950/50'
              : 'bg-white/90 border-slate-200/90 text-slate-700 shadow-slate-900/10'
          }`}
        >
          <div className="flex items-center justify-end space-x-1.5 mb-0.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLoginPage ? 'bg-yellow-400' : 'bg-emerald-500'
              }`}
            ></span>
            <span
              className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                isLoginPage ? 'text-yellow-400/90' : 'text-slate-500'
              }`}
            >
              Developed and Maintained by
            </span>
          </div>
          <p
            className={`text-xs sm:text-sm font-black tracking-tight ${
              isLoginPage ? 'text-white' : 'text-slate-900'
            }`}
          >
            Kowshiek R
          </p>
          <p
            className={`text-[9px] sm:text-[10px] font-semibold ${
              isLoginPage ? 'text-emerald-300/85' : 'text-slate-500'
            }`}
          >
            Department of Information Technology
          </p>
        </div>
      </aside>
  );
};
