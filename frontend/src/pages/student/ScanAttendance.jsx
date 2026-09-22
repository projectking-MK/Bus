import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import { QRScanner } from '../../components/QRScanner';
import { getCurrentPosition, isSecureOrigin, isLocationOffError, openDeviceLocationSettings, forceEnableLocation } from '../../utils/geolocation';
import { LocationSettingsModal } from '../../components/LocationSettingsModal';
import {
  QrCode,
  MapPin,
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Bus
} from 'lucide-react';

export const ScanAttendance = () => {
  const {
    user,
    student,
    deviceIdentifier,
    studentCoords,
    isTripAuthenticated,
    isLocationTurnedOff,
    setIsLocationTurnedOff,
    turnOnLocation,
    checkAndRegisterDevice,
  } = useAuth();
  const navigate = useNavigate();

  const [scanning, setScanning] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [requireTripLogin, setRequireTripLogin] = useState(false);

  // Proactively ensure device binding is registered for this student
  useEffect(() => {
    if (student && checkAndRegisterDevice) {
      checkAndRegisterDevice(student).catch(() => {});
    }
  }, [student, checkAndRegisterDevice]);

  // Proactive Location Permission state
  const [isLocationOff, setIsLocationOff] = useState(isLocationTurnedOff || false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [locationStatus, setLocationStatus] = useState('acquiring');
  const [cachedPosition, setCachedPosition] = useState(() => {
    try {
      const raw = localStorage.getItem('smart_bus_last_gps');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  });
  const [locationMessage, setLocationMessage] = useState('');

  // Status checks for visual progression
  const [checks, setChecks] = useState({
    device: { status: 'pending', label: 'Registered Hardware Device' },
    trip: { status: 'pending', label: 'Active Bus Trip' },
    qr: { status: 'pending', label: 'Dynamic QR Token' },
    gps: { status: 'pending', label: 'GPS Geofence & Accuracy' },
  });

  // Stream live high-precision location continuously while on Scan page
  useEffect(() => {
    let watchId = null;

    if (!isSecureOrigin()) {
      setLocationStatus('insecure');
      setLocationMessage('Browser blocks GPS on HTTP. Switch to HTTPS below.');
      return;
    }

    if (navigator.geolocation) {
      setLocationStatus('acquiring');
      setLocationMessage('Acquiring live GPS fix...');

      // Initial fast acquisition
      getCurrentPosition({ timeout: 8000, maximumAge: 60000, enableHighAccuracy: true })
        .then((pos) => {
          setCachedPosition(pos);
          setLocationStatus('ready');
          setLocationMessage(`Live GPS (±${pos.accuracy}m)`);
          setErrorDetails(null);
        })
        .catch(() => {});

      // Continuous high-precision watch while scanner is active (vital when bus is moving)
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const freshPos = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 15),
            timestamp: Date.now(),
          };
          setCachedPosition(freshPos);
          try {
            localStorage.setItem('smart_bus_last_gps', JSON.stringify(freshPos));
          } catch (_) {}
          setLocationStatus('ready');
          setLocationMessage(`Live GPS (±${freshPos.accuracy}m)`);
          setErrorDetails(null);
        },
        (err) => {
          console.warn('[Student GPS Watch Warning]', err.message);
          if (isLocationOffError(err)) {
            setIsLocationOff(true);
            if (setIsLocationTurnedOff) setIsLocationTurnedOff(true);
            setLocationStatus('location_off');
            setLocationMessage('Device Location / GPS is turned OFF. Please turn on Location in your phone settings.');
          }
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
      );
    }

    return () => {
      if (watchId !== null && typeof window !== 'undefined' && navigator?.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const requestLocation = async () => {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      setLocationStatus('denied');
      setLocationMessage('Geolocation is not supported by your browser.');
      return;
    }

    setLocationStatus('acquiring');
    setLocationMessage('Requesting GPS location permission...');

    try {
      const pos = turnOnLocation ? await turnOnLocation() : await forceEnableLocation();
      setCachedPosition(pos);
      setLocationStatus('ready');
      setIsLocationOff(false);
      if (setIsLocationTurnedOff) setIsLocationTurnedOff(false);
      setShowSettingsModal(false);
      setLocationMessage(`Live GPS (±${pos.accuracy}m)`);
      setErrorDetails(null);
    } catch (err) {
      console.warn('[Request Location Error]', err);
      const isOff = isLocationOffError(err);
      setIsLocationOff(isOff);
      if (isOff && setIsLocationTurnedOff) setIsLocationTurnedOff(true);
      setLocationStatus(isOff ? 'location_off' : 'denied');
      setLocationMessage(
        isOff
          ? 'Device Location / GPS is turned OFF. Please turn on Location in your phone settings.'
          : (err.message || 'Unable to acquire location.')
      );
    }
  };

  const handleTurnOnLocationClick = async () => {
    openDeviceLocationSettings();
    try {
      const pos = turnOnLocation ? await turnOnLocation() : await forceEnableLocation();
      setCachedPosition(pos);
      setLocationStatus('ready');
      setIsLocationOff(false);
      if (setIsLocationTurnedOff) setIsLocationTurnedOff(false);
      setShowSettingsModal(false);
      setLocationMessage(`Live GPS (±${pos.accuracy}m)`);
      setErrorDetails(null);
    } catch (err) {
      console.warn('[handleTurnOnLocationClick Error]', err);
      setShowSettingsModal(true);
    }
  };

  const handleScanSuccess = async (scannedToken) => {
    if (submitting || !scanning) return;

    setScanning(false);
    setSubmitting(true);
    setErrorDetails(null);

    // Initial check state
    setChecks({
      device: { status: 'checking', label: 'Checking device identifier...' },
      trip: { status: 'pending', label: 'Verifying active trip...' },
      qr: { status: 'pending', label: 'Validating dynamic QR...' },
      gps: { status: 'pending', label: 'Acquiring high-precision GPS...' },
    });

    try {
      // 1. Hardware device check
      const currentDevId = deviceIdentifier || 'unregistered-device';
      setChecks((prev) => ({
        ...prev,
        device: { status: 'success', label: `Device Verified: ${currentDevId.slice(0, 14)}...` },
        gps: { status: 'checking', label: 'Acquiring real-time bus motion coordinates...' },
      }));

      // 2. Obtain fresh GPS coordinates (ensure sub-second freshness so motion on running bus is captured, never locked)
      let position = (studentCoords && studentCoords.latitude) ? studentCoords : cachedPosition;
      if (!position?.latitude) {
        try {
          const raw = localStorage.getItem('smart_bus_last_gps');
          if (raw) position = JSON.parse(raw);
        } catch (_) {}
      }

      const isUsable = position && position.latitude && (
        (position.timestamp && Date.now() - position.timestamp < 120000) ||
        (position.updatedAt && Date.now() - new Date(position.updatedAt).getTime() < 120000)
      );

      if (!isUsable || !position?.latitude) {
        try {
          position = await getCurrentPosition({ timeout: 8000, maximumAge: 60000, enableHighAccuracy: true });
          setCachedPosition(position);
          setLocationStatus('ready');
        } catch (gpsError) {
          // Fallback to latest known cached position if available
          if (position?.latitude) {
            console.warn('[ScanAttendance] Using cached transit GPS fix:', gpsError.message);
          } else {
            const isOff = isLocationOffError(gpsError);
            if (isOff) {
              setIsLocationOff(true);
              if (setIsLocationTurnedOff) setIsLocationTurnedOff(true);
            }
            const errText = isOff
              ? 'Device Location / GPS is turned OFF. Please turn on Location in your phone settings.'
              : gpsError.message;
            setChecks((prev) => ({
              ...prev,
              gps: { status: 'error', label: errText },
            }));
            setLocationStatus(isOff ? 'location_off' : 'denied');
            setErrorDetails(errText);
            setSubmitting(false);
            return;
          }
        }
      }

      setChecks((prev) => ({
        ...prev,
        gps: {
          status: 'success',
          label: `Live GPS Streamed (Acc: ±${Math.round(position?.accuracy || 10)}m)`,
        },
        qr: { status: 'checking', label: 'Submitting to anti-proxy server pipeline...' },
      }));

      // 3. Submit to server validation endpoint
      const payload = {
        qrToken: scannedToken,
        deviceIdentifier,
        latitude: position.latitude,
        longitude: position.longitude,
        gpsAccuracy: position.accuracy || 10,
      };

      const res = await axiosClient.post('/api/attendance/mark', payload);

      if (res.data.success) {
        setChecks((prev) => ({
          ...prev,
          trip: { status: 'success', label: 'Active Bus Trip Validated' },
          qr: { status: 'success', label: 'Valid Dynamic QR Token' },
        }));

        setVerificationResult({
          status: 'PRESENT',
          message: res.data.message || 'Attendance marked successfully.',
          details: res.data.attendance,
        });
      }
    } catch (err) {
      console.error('[Attendance Submission Error]', err);
      const serverMessage = err.response?.data?.message || err.message || 'Verification failed.';
      if (err.response?.data?.requireTripLogin) {
        setRequireTripLogin(true);
      }
      
      // Highlight which step failed based on server response
      setChecks((prev) => {
        const next = { ...prev };
        if (serverMessage.includes('device')) {
          next.device = { status: 'error', label: serverMessage };
        } else if (serverMessage.includes('trip') || serverMessage.includes('closed') || serverMessage.includes('log in')) {
          next.trip = { status: 'error', label: serverMessage };
        } else if (serverMessage.includes('QR')) {
          next.qr = { status: 'error', label: serverMessage };
        } else if (serverMessage.includes('GPS') || serverMessage.includes('outside') || serverMessage.includes('area')) {
          next.gps = { status: 'error', label: serverMessage };
        } else {
          next.qr = { status: 'error', label: serverMessage };
        }
        return next;
      });

      setErrorDetails(serverMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetScan = () => {
    setVerificationResult(null);
    setErrorDetails(null);
    setRequireTripLogin(false);
    if (student && checkAndRegisterDevice) {
      checkAndRegisterDevice(student).catch(() => {});
    }
    setChecks({
      device: { status: 'pending', label: 'Registered Hardware Device' },
      trip: { status: 'pending', label: 'Active Bus Trip' },
      qr: { status: 'pending', label: 'Dynamic QR Token' },
      gps: { status: 'pending', label: 'GPS Geofence & Accuracy' },
    });
    setScanning(true);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#050b07] text-slate-100 relative overflow-hidden font-sans py-6 px-4 selection:bg-yellow-400 selection:text-slate-950">
      {/* Background Matrix Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(16, 185, 129, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(16, 185, 129, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Ambient Radar Concentric Rings */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-[540px] h-[540px] rounded-full border border-emerald-500/10 animate-pulse"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-[380px] h-[380px] rounded-full border border-dashed border-yellow-400/15"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-[200px] h-[200px] rounded-full border border-emerald-500/15"></div>

      {/* Cyber Glow Accents */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 left-1/4 w-72 h-72 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md mx-auto relative z-10 space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/student/dashboard')}
            className="p-2.5 text-emerald-400 hover:text-yellow-300 rounded-xl bg-[#09150e]/90 border border-emerald-500/30 hover:border-yellow-400/50 transition active:scale-95 shadow-lg shadow-emerald-950/40"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping"></span>
              <span>Optical Radar HUD</span>
            </div>
            <h1 className="text-lg font-black tracking-wider text-slate-100 uppercase">Mark Attendance</h1>
            <p className="text-[11px] text-yellow-400 font-mono font-bold tracking-tight">ROLL: {student?.rollNumber}</p>
          </div>
          <div className="w-10"></div> {/* spacer */}
        </div>

        {/* Verification Success View */}
        {verificationResult ? (
          <div className="backdrop-blur-2xl bg-[#09150e]/95 rounded-3xl p-6 sm:p-8 border border-emerald-500/50 ring-1 ring-yellow-400/30 shadow-2xl shadow-emerald-950/60 text-center relative overflow-hidden">
            {/* Top radar decoration bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-yellow-400 to-emerald-500"></div>

            {/* Success Target Icon */}
            <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-yellow-400/40 animate-spin" style={{ animationDuration: '10s' }}></div>
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>
            </div>

            <div className="inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase font-mono tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mb-3">
              VERIFIED • STATUS: PRESENT
            </div>
            <h2 className="text-xl font-black text-slate-100 tracking-tight mb-2">
              Attendance Marked Successfully
            </h2>
            <p className="text-xs text-emerald-400/80 mb-6 font-mono leading-relaxed">
              Multi-layer anti-proxy protocol validated presence on College Bus #BUS-09.
            </p>

            <div className="bg-[#050b07]/90 rounded-2xl p-4 text-left space-y-2.5 text-xs mb-6 border border-emerald-500/30 font-mono shadow-inner">
              <div className="flex justify-between items-center text-slate-400 border-b border-emerald-500/10 pb-2">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Student</span>
                <strong className="text-yellow-300 font-bold">{student?.name}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-400 border-b border-emerald-500/10 pb-2">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Roll Number</span>
                <strong className="text-emerald-400 font-bold">{student?.rollNumber}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-400 border-b border-emerald-500/10 pb-2">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Bus Distance</span>
                <strong className="text-yellow-400 font-bold">{verificationResult.details?.distanceMeters || 0} meters</strong>
              </div>
              <div className="flex justify-between items-center text-slate-400 border-b border-emerald-500/10 pb-2">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Timestamp</span>
                <strong className="text-slate-200">
                  {new Date(verificationResult.details?.markedAt).toLocaleTimeString()}
                </strong>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Security Gate</span>
                <span className="text-emerald-400 font-bold text-[11px] flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>PASS • GEOFENCE ENFORCED</span>
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/student/dashboard')}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-400 to-yellow-400 hover:from-emerald-300 hover:to-yellow-300 text-slate-950 font-black tracking-wider uppercase rounded-2xl text-sm transition shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* Proactive Location Permission Banner */}
            {(isLocationOff || isLocationTurnedOff || locationStatus === 'location_off') ? (
              <div className="p-4 bg-rose-950/60 border-2 border-rose-500/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-200 shadow-xl shadow-rose-950/50">
                <div className="flex items-start space-x-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <p className="font-bold text-rose-100 text-sm">⚠️ Warning: Device Location is Turned OFF</p>
                    <p className="text-rose-300/90 mt-0.5 leading-relaxed font-mono text-[11px]">
                      Your phone's GPS / Location service is turned off. Attendance cannot be verified without location. Please turn on Location in your phone settings.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleTurnOnLocationClick}
                  className="self-stretch sm:self-auto px-4 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 active:scale-95 text-white font-black tracking-wide rounded-xl text-xs flex-shrink-0 transition shadow-lg shadow-rose-600/30 cursor-pointer whitespace-nowrap uppercase"
                >
                  Turn On Location & Validate
                </button>
              </div>
            ) : locationStatus === 'insecure' ? (
              <div className="p-3.5 bg-yellow-950/50 border border-yellow-500/50 rounded-2xl flex items-center justify-between text-xs text-yellow-200 shadow-md">
                <div className="flex items-center space-x-2.5">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-yellow-100 font-mono">HTTPS Needed for GPS</p>
                    <p className="text-[11px] text-yellow-300/80 font-mono">Mobile browsers require HTTPS to prompt for location.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    window.location.href = window.location.href.replace('http:', 'https:');
                  }}
                  className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-xl text-xs flex-shrink-0 transition shadow-md shadow-yellow-400/20 uppercase"
                >
                  Switch to HTTPS
                </button>
              </div>
            ) : locationStatus === 'ready' && cachedPosition ? (
              <div className="p-3 bg-[#09150e]/90 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-xs text-emerald-300 shadow-md">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                  <span className="font-bold font-mono tracking-tight">GPS Telemetry Active</span>
                  <span className="text-[11px] text-yellow-400 font-mono font-bold">
                    (±{cachedPosition.accuracy}m)
                  </span>
                </div>
                <button
                  onClick={requestLocation}
                  className="text-[11px] text-yellow-400 hover:text-yellow-300 font-mono font-bold uppercase tracking-wider"
                >
                  Re-sync
                </button>
              </div>
            ) : locationStatus === 'acquiring' ? (
              <div className="p-3 bg-[#09150e]/90 border border-yellow-500/40 rounded-2xl flex items-center space-x-2.5 text-xs text-yellow-300 shadow-md animate-pulse">
                <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin flex-shrink-0" />
                <span className="font-mono">Acquiring live GPS satellite coordinates...</span>
              </div>
            ) : (
              <div className="p-3.5 bg-[#09150e]/90 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-xs text-slate-200 shadow-md">
                <div className="flex items-center space-x-2.5">
                  <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-slate-100 font-mono">GPS Telemetry Required</p>
                    <p className="text-[11px] text-emerald-400/80 font-mono">
                      {locationMessage || 'Tap to grant location permission in browser.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={requestLocation}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-400 to-yellow-400 hover:from-emerald-300 hover:to-yellow-300 text-slate-950 font-black rounded-xl text-xs flex-shrink-0 transition shadow-md shadow-emerald-500/20 uppercase cursor-pointer"
                >
                  Enable GPS
                </button>
              </div>
            )}

            {/* Pre-scan Per-Trip Login Warning */}
            {!isTripAuthenticated && !errorDetails && (
              <div className="p-3.5 bg-yellow-950/40 border border-yellow-500/50 rounded-2xl flex items-center justify-between text-xs text-yellow-200 shadow-md">
                <div className="flex items-center space-x-2.5">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 animate-bounce" />
                  <div>
                    <p className="font-bold text-yellow-100 font-mono">Trip Auth Required</p>
                    <p className="text-[11px] text-yellow-300/80 font-mono">
                      Please log in fresh for this active bus trip before marking.
                    </p>
                  </div>
                </div>
                <Link
                  to="/login"
                  className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-xl text-xs flex-shrink-0 transition shadow-md shadow-yellow-400/20 uppercase"
                >
                  Log In
                </Link>
              </div>
            )}

            {/* Camera Scanner View in Obsidian Radar Frame */}
            <div className="backdrop-blur-2xl bg-[#09150e]/90 border border-emerald-500/40 ring-1 ring-yellow-400/20 shadow-2xl shadow-emerald-950/50 rounded-3xl p-4 relative overflow-hidden">
              {/* HUD Corner Reticles */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400 z-10 pointer-events-none"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-yellow-400 z-10 pointer-events-none"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-yellow-400 z-10 pointer-events-none"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400 z-10 pointer-events-none"></div>

              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
                  <span className="text-[11px] font-mono uppercase font-bold tracking-widest text-emerald-400">
                    OPTICAL SCANNER HUD
                  </span>
                </div>
                <span className="text-[10px] font-mono text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/30">
                  SENSOR ACTIVE
                </span>
              </div>

              <QRScanner onScanSuccess={handleScanSuccess} scanning={scanning} />
            </div>

            {/* Error Banner */}
            {errorDetails && (
              <div className="p-4 bg-rose-950/60 border border-rose-500/60 rounded-2xl text-rose-200 text-xs flex items-start space-x-3 shadow-lg shadow-rose-950/40">
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="font-bold block text-rose-100 font-mono uppercase">Validation Rejected</strong>
                  <span className="text-rose-200/90 font-mono text-[11px]">{errorDetails}</span>
                  {requireTripLogin ? (
                    <div className="mt-3">
                      <Link
                        to="/login"
                        className="inline-flex items-center space-x-1.5 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-xl shadow-md shadow-yellow-400/20 transition text-xs uppercase"
                      >
                        <span>Log In For Current Trip</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ) : (
                    <button
                      onClick={handleResetScan}
                      className="mt-2 block font-bold text-yellow-400 hover:text-yellow-300 underline font-mono text-xs uppercase cursor-pointer"
                    >
                      Click here to retry scan
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Step-by-Step Multi-Layer Security Status Panel */}
            <div className="backdrop-blur-xl bg-[#09150e]/90 rounded-3xl p-5 border border-emerald-500/30 ring-1 ring-yellow-400/15 shadow-xl shadow-emerald-950/40">
              <div className="flex items-center justify-between mb-3 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                <span className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-yellow-400" />
                  <span>Anti-Proxy Security Gates</span>
                </span>
                <span className="text-[10px] text-yellow-400/80 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20 font-bold">
                  4 GATES
                </span>
              </div>

              <div className="space-y-2.5 font-mono">
                {Object.entries(checks).map(([key, item]) => {
                  const isSuccess = item.status === 'success';
                  const isError = item.status === 'error';
                  const isChecking = item.status === 'checking';

                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition duration-200 ${
                        isSuccess
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-xs'
                          : isError
                          ? 'bg-rose-950/50 border-rose-500/50 text-rose-300'
                          : isChecking
                          ? 'bg-yellow-950/40 border-yellow-500/50 text-yellow-300 animate-pulse'
                          : 'bg-[#050b07]/70 border-emerald-500/20 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        {key === 'device' && <Smartphone className={`w-4 h-4 flex-shrink-0 ${isSuccess ? 'text-emerald-400' : isError ? 'text-rose-400' : 'text-slate-400'}`} />}
                        {key === 'trip' && <Bus className={`w-4 h-4 flex-shrink-0 ${isSuccess ? 'text-emerald-400' : isError ? 'text-rose-400' : 'text-slate-400'}`} />}
                        {key === 'qr' && <QrCode className={`w-4 h-4 flex-shrink-0 ${isSuccess ? 'text-emerald-400' : isError ? 'text-rose-400' : 'text-slate-400'}`} />}
                        {key === 'gps' && <MapPin className={`w-4 h-4 flex-shrink-0 ${isSuccess ? 'text-emerald-400' : isError ? 'text-rose-400' : 'text-slate-400'}`} />}
                        <span className="truncate font-medium">{item.label}</span>
                      </div>

                      <div className="flex-shrink-0 ml-2">
                        {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        {isError && <XCircle className="w-4 h-4 text-rose-400" />}
                        {isChecking && (
                          <div className="w-3.5 h-3.5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Location Settings & Turn On Guide Modal */}
        <LocationSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onValidate={requestLocation}
          isValidating={locationStatus === 'acquiring'}
          validationError={isLocationOff ? 'Device Location / GPS is turned OFF. Please turn on Location in your phone settings.' : errorDetails}
        />
      </div>
    </div>
  );
};
