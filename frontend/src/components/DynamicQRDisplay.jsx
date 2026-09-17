import React, { useState, useEffect, useRef } from 'react';
import QRCodeLib from 'qrcode';
import axiosClient from '../api/axiosClient';
import { RefreshCw, Clock, ShieldCheck, AlertCircle, Download, Copy, Check } from 'lucide-react';

export const DynamicQRDisplay = ({ activeTrip, onTokenChange }) => {
  const [qrData, setQrData] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(2400);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const timerRef = useRef(null);

  const fetchCurrentQR = async () => {
    try {
      setError(null);
      const res = await axiosClient.get('/api/qr/current');
      if (res.data.success) {
        setQrData(res.data);
        const secs = res.data.remainingSeconds || 2400;
        setRemainingSeconds(secs);
        if (onTokenChange) onTokenChange(res.data.token);

        // Generate crisp local data URL QR code
        try {
          const url = await QRCodeLib.toDataURL(res.data.token, {
            width: 450,
            margin: 2,
            color: {
              dark: '#1e1b4b',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'H',
          });
          setQrDataUrl(url);
        } catch (qrErr) {
          console.warn('Local QR generation error, using fallback:', qrErr);
          setQrDataUrl(
            `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
              res.data.token
            )}`
          );
        }
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
          // Token expired, immediately fetch the new active token (40-minute TTL)
          fetchCurrentQR();
          return 2400;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [qrData?.token]);

  const totalSeconds = qrData?.totalValiditySeconds || 2400;
  const percentageRemaining = Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100));

  // Friendly time format: e.g. "19m 45s" or "45s"
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m > 0) {
      return `${m}m ${s < 10 ? '0' : ''}${s}s`;
    }
    return `${s}s`;
  };

  // Determine timer color
  const timerColor =
    remainingSeconds > 180
      ? 'text-emerald-600 border-emerald-500'
      : remainingSeconds > 60
      ? 'text-amber-500 border-amber-500'
      : 'text-rose-600 border-rose-500 animate-pulse';

  // Copy token to clipboard
  const handleCopyToken = () => {
    if (!qrData?.token) return;
    navigator.clipboard.writeText(qrData.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download high-resolution branded attendance QR image for sending to students
  const handleDownloadQR = async () => {
    if (!qrDataUrl) return;
    setDownloading(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 650;
      canvas.height = 760;
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Top decorative header banner
      ctx.fillStyle = '#4f46e5'; // Indigo-600
      ctx.fillRect(0, 0, canvas.width, 100);

      // Header Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🚌 SMART BUS ATTENDANCE', canvas.width / 2, 45);

      ctx.fillStyle = '#e0e7ff';
      ctx.font = '14px sans-serif';
      ctx.fillText(`Trip: ${activeTrip?.tripId || 'ACTIVE'} • Capacity: 55 Students`, canvas.width / 2, 75);

      // Draw QR image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = qrDataUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const qrSize = 440;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 125;

      // QR container background & border
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(qrX - 15, qrY - 15, qrSize + 30, qrSize + 30, 20);
      ctx.fill();
      ctx.stroke();

      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      // Validity & instructions badge
      ctx.fillStyle = '#10b981'; // Emerald
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('⏳ VALID FOR 20 MINUTES', canvas.width / 2, 600);

      ctx.fillStyle = '#475569';
      ctx.font = '13px sans-serif';
      ctx.fillText('Scan using your registered smartphone via the Attendance App', canvas.width / 2, 630);

      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.fillText(`Generated at: ${new Date().toLocaleTimeString()} • Haversine Geofence Protected`, canvas.width / 2, 660);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`Token: ${qrData.token}`, canvas.width / 2, 700);

      // Trigger download
      const link = document.createElement('a');
      link.download = `Bus-Attendance-QR-Trip-${activeTrip?.tripId || 'ACTIVE'}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to create QR download image:', err);
      // Direct fallback
      const link = document.createElement('a');
      link.download = `Bus-QR-Token-${Date.now()}.png`;
      link.href = qrDataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden text-center p-6 sm:p-8 max-w-md mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 text-indigo-600">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Anti-Proxy QR (20-Min TTL)</span>
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
          <p className="text-sm font-medium text-slate-500">Generating secure 3-minute QR token...</p>
        </div>
      ) : (
        <>
          {/* Large QR Display Container */}
          <div className="relative mx-auto w-64 h-64 sm:w-72 sm:h-72 bg-slate-50 p-3 rounded-2xl border-2 border-indigo-100 shadow-inner flex items-center justify-center">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
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

          {/* Action Buttons: Download QR & Copy Token */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={handleDownloadQR}
              disabled={downloading || !qrDataUrl}
              className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-indigo-200 flex items-center justify-center space-x-1.5 disabled:opacity-50"
              title="Download QR image to send to students"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Preparing Image...' : 'Download QR Image'}</span>
            </button>

            <button
              onClick={handleCopyToken}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition border border-slate-200 flex items-center justify-center space-x-1"
              title="Copy active token"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy Token'}</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500 mt-2">
            💡 Download & send to students. They have <strong>20 minutes</strong> to scan and mark attendance!
          </p>

          {/* Countdown timer & progress bar */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Token Expiry</span>
              </span>
              <span className={`font-mono text-sm font-bold ${timerColor}`}>
                {formatTime(remainingSeconds)} remaining
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                  remainingSeconds > 180 ? 'bg-emerald-500' : remainingSeconds > 60 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${percentageRemaining}%` }}
              ></div>
            </div>
          </div>

          {/* Token info banner */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Trip: <strong className="text-slate-700 font-mono">{activeTrip?.tripId || 'ACTIVE'}</strong></span>
            <span>Window: <strong className="text-indigo-600 font-mono">40 Mins (2400s)</strong></span>
          </div>
        </>
      )}
    </div>
  );
};
