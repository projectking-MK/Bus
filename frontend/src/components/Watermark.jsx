import React from 'react';
import { useLocation } from 'react-router-dom';

export const Watermark = () => {
  const location = useLocation();
  const isDarkRadar = location.pathname === '/login' || location.pathname.startsWith('/student');

  return (
    <aside
      aria-label="Developer Watermark"
      className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 pointer-events-none select-none"
    >
        <div
          className={`px-3 py-2 rounded-xl backdrop-blur-md shadow-lg border text-right transition-all duration-300 ${
            isDarkRadar
              ? 'bg-[#09150e]/95 border-emerald-500/40 ring-1 ring-yellow-400/20 text-emerald-100 shadow-emerald-950/60'
              : 'bg-white/90 border-slate-200/90 text-slate-700 shadow-slate-900/10'
          }`}
        >
          <div className="flex items-center justify-end space-x-1.5 mb-0.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isDarkRadar ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-500'
              }`}
            ></span>
            <span
              className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                isDarkRadar ? 'text-yellow-400/90' : 'text-slate-500'
              }`}
            >
              Developed and Maintained by
            </span>
          </div>
          <p
            className={`text-xs sm:text-sm font-black tracking-tight ${
              isDarkRadar ? 'text-white font-mono' : 'text-slate-900'
            }`}
          >
            Kowshiek R
          </p>
          <p
            className={`text-xs sm:text-sm font-bold tracking-tight ${
              isDarkRadar ? 'text-yellow-300/90 font-mono' : 'text-slate-700'
            }`}
          >
            Department of IT
          </p>
        </div>
      </aside>
  );
};
