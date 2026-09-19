import React from 'react';
import { useLocation } from 'react-router-dom';

export const Watermark = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <>
      {/* 1. Repeating diagonal watermark overlay across entire viewport */}
      <aside
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none select-none z-20 overflow-hidden flex flex-col justify-around py-4"
      >
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            className={`flex justify-around items-center -rotate-12 whitespace-nowrap transform ${
              isLoginPage
                ? 'text-yellow-400/[0.07]'
                : 'text-slate-900/[0.045]'
            }`}
          >
            {[0, 1, 2].map((col) => (
              <div key={col} className="text-center px-6 py-4">
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.25em]">
                  Developed and Maintained by
                </p>
                <p className="text-xl sm:text-3xl font-black uppercase tracking-[0.2em] my-0.5 sm:my-1">
                  Kowshiek R
                </p>
                <p className="text-[10px] sm:text-xs font-semibold tracking-[0.18em] uppercase">
                  Department of Information Technology
                </p>
              </div>
            ))}
          </div>
        ))}
      </aside>

      {/* 2. Floating persistent watermark badge in bottom-right corner */}
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
    </>
  );
};
