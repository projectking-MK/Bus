import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import { RefreshCw, Clock, ShieldCheck, AlertCircle } from 'lucide-react';

export const DynamicQRDisplay = ({ activeTrip, onTokenChange }) => {
  const [qrData, setQrData] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const fetchCurrentQR = async () => {
    try {
      setError(null);
      const res = await axiosClient.get('/api/qr/current');
      if (res.data.success) {
        setQrData(res.data);
        setRemainingSeconds(res.data.remainingSeconds || 25);
        if (onTokenChange) onTokenChange(res.data.token);
      }
    } catch (err) {
      console.error('Error fetching dynamic QR:', err);
      setError(err.response?.data?.message || 'Failed to load dynamic QR token.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentQR();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTrip?.tripId]);

  // Countdown timer effect
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Token expired, immediately fetch the new active token
          fetchCurrentQR();
          return 25;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [qrData?.token]);

  const percentageRemaining = Math.max(0, Math.min(100, (remainingSeconds / (qrData?.totalValiditySeconds || 25)) * 100));

  // Determine timer color
  const timerColor =
    remainingSeconds > 10
      ? 'text-emerald-600 border-emerald-500'
      : remainingSeconds > 5
      ? 'text-amber-500 border-amber-500'
      : 'text-rose-600 border-rose-500 animate-pulse';

  const qrImageUrl = qrData?.token
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(qrData.token)}`
    : null;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden text-center p-6 sm:p-8 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 text-indigo-600">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Dynamic Anti-Proxy QR</span>
        </div>
        <button
          onClick={fetchCurrentQR}
          disabled={loading}
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
          title="Force Refresh Token"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error ? (
        <div className="p-6 bg-rose-50 rounded-xl border border-rose-200 text-rose-700 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : loading && !qrData ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Generating secure rotating token...</p>
        </div>
      ) : (
        <>
          {/* Large QR Display Container */}
          <div className="relative mx-auto w-64 h-64 sm:w-72 sm:h-72 bg-slate-50 p-3 rounded-2xl border-2 border-indigo-100 shadow-inner flex items-center justify-center">
            {qrImageUrl && (
              <img
                src={qrImageUrl}
                alt="Dynamic Trip Attendance QR Code"
                className="w-full h-full object-contain rounded-xl"
                loading="eager"
              />
            )}
            {/* Live scanning target corner markers */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-indigo-600 pointer-events-none"></div>
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-indigo-600 pointer-events-none"></div>
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-indigo-600 pointer-events-none"></div>
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-indigo-600 pointer-events-none"></div>
          </div>

          {/* Countdown timer & progress bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Token Expiry</span>
              </span>
              <span className={`font-mono text-sm font-bold ${timerColor}`}>
                {remainingSeconds}s remaining
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                  remainingSeconds > 10 ? 'bg-emerald-500' : remainingSeconds > 5 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${percentageRemaining}%` }}
              ></div>
            </div>
          </div>

          {/* Token info banner */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Trip: <strong className="text-slate-700 font-mono">{activeTrip?.tripId || 'ACTIVE'}</strong></span>
            <span>Security: <strong className="text-indigo-600">Rotating 25s TTL</strong></span>
          </div>
        </>
      )}
    </div>
  );
};
