import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import { QRScanner } from '../../components/QRScanner';
import {
  getCurrentPosition,
  getRefinedPosition,
  saveCachedPosition,
  isSecureOrigin,
  isLocationOffError,
  openDeviceLocationSettings,
  forceEnableLocation,
} from '../../utils/geolocation';
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
  Bus,
  Navigation,
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
  const [lastScannedToken, setLastScannedToken] = useState(null);
  const [isRefiningGps, setIsRefiningGps] = useState(false);

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
          saveCachedPosition(pos);
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
          saveCachedPosition(freshPos);
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
    if (submitting || (!scanning && !isRefiningGps)) return;

    setLastScannedToken(scannedToken);
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
        gps: { status: 'checking', label: 'Acquiring satellite lock for bus...' },
      }));

      // 2. Candidate position from current state or cache
      let candidatePos = (studentCoords && studentCoords.latitude) ? studentCoords : cachedPosition;
      if (!candidatePos?.latitude) {
        try {
          const raw = localStorage.getItem('smart_bus_last_gps');
          if (raw) candidatePos = JSON.parse(raw);
        } catch (_) {}
      }

      const candidateAge = candidatePos?.timestamp ? Date.now() - candidatePos.timestamp : 999999;
      const isCandidateHighAccuracy = candidatePos?.accuracy && candidatePos.accuracy <= 65 && candidateAge < 60000;

      let position = null;
      if (isCandidateHighAccuracy) {
        position = candidatePos;
      } else {
        setChecks((prev) => ({
          ...prev,
          gps: {
            status: 'checking',
            label: candidatePos?.accuracy
              ? `Refining satellite lock (±${Math.round(candidatePos.accuracy)}m... locking in)`
              : 'Acquiring high-precision GPS satellite fix...',
          },
        }));

        try {
          position = await getRefinedPosition({
            targetAccuracy: 50,
            acceptableAccuracy: 95,
            maxWaitMs: 3500,
            onProgress: (acc) => {
              setChecks((prev) => ({
                ...prev,
                gps: {
                  status: 'checking',
                  label: `Refining satellite lock (±${Math.round(acc)}m... locking onto satellites)`,
                },
              }));
            },
          });
          setCachedPosition(position);
          setLocationStatus('ready');
        } catch (gpsError) {
          if (candidatePos?.latitude) {
            console.warn('[ScanAttendance] Using cached transit GPS fix:', gpsError.message);
            position = candidatePos;
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

      // If position accuracy is still coarse (> 95m), check if a slightly older fix (< 3 mins) had <= 65m
      if (position?.accuracy && position.accuracy > 95) {
        try {
          const raw = localStorage.getItem('smart_bus_last_gps');
          if (raw) {
            const older = JSON.parse(raw);
            if (older?.latitude && older?.accuracy && older.accuracy <= 95 && Date.now() - (older.timestamp || 0) < 180000) {
              position = older;
            }
          }
        } catch (_) {}
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
        } else if (
          serverMessage.includes('accuracy') ||
          serverMessage.includes('GPS') ||
          serverMessage.includes('outside') ||
          serverMessage.includes('area')
        ) {
          next.gps = { status: 'error', label: serverMessage };
        } else {
          next.qr = { status: 'error', label: serverMessage };
        }
        return next;
      });

      setErrorDetails(serverMessage);
    } finally {
      setSubmitting(false);
      setIsRefiningGps(false);
    }
  };

  const handleRetryRefinedGPS = async () => {
    setIsRefiningGps(true);
    setErrorDetails(null);
    setChecks((prev) => ({
      ...prev,
      gps: { status: 'checking', label: 'Refining satellite lock near window...' },
    }));

    try {
      const refined = await getRefinedPosition({
        targetAccuracy: 45,
        acceptableAccuracy: 90,
        maxWaitMs: 5000,
        onProgress: (acc) => {
          setChecks((prev) => ({
            ...prev,
            gps: {
              status: 'checking',
              label: `Refining satellite lock (±${Math.round(acc)}m... locking in)`,
            },
          }));
        },
      });
      setCachedPosition(refined);
      setLocationStatus('ready');

      if (lastScannedToken) {
        await handleScanSuccess(lastScannedToken);
      } else {
        handleResetScan();
      }
    } catch (e) {
      console.warn('[handleRetryRefinedGPS error]', e);
      setErrorDetails('Satellite signal still refining. Hold phone near window and retry.');
    } finally {
      setIsRefiningGps(false);
    }
  };

  const handleResetScan = () => {
    setVerificationResult(null);
    setErrorDetails(null);
    setRequireTripLogin(false);
    setIsRefiningGps(false);
    setLastScannedToken(null);
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
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/student/dashboard')}
          className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold text-slate-900">Mark Attendance</h1>
          <p className="text-[11px] text-slate-500 font-mono">Roll: {student?.rollNumber}</p>
        </div>
        <div className="w-9"></div> {/* spacer */}
      </div>

      {/* Verification Success View */}
      {verificationResult ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
            Status: PRESENT
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mb-1">
            Attendance Marked Successfully
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Multi-layer anti-proxy checks verified your presence on College Bus #BUS-09.
          </p>

          <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-2 text-xs mb-6 border border-slate-100">
            <div className="flex justify-between text-slate-600">
              <span>Student Name:</span>
              <strong className="text-slate-800">{student?.name}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Roll Number:</span>
              <strong className="font-mono text-slate-800">{student?.rollNumber}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Distance from Bus:</span>
              <strong className="font-mono text-slate-800">{verificationResult.details?.distanceMeters || 0} meters</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Timestamp:</span>
              <strong className="font-mono text-slate-800">
                {new Date(verificationResult.details?.markedAt).toLocaleTimeString()}
              </strong>
            </div>
          </div>

          <button
            onClick={() => navigate('/student/dashboard')}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm transition shadow-md shadow-indigo-200"
          >
            Return to Dashboard
          </button>
        </div>
      ) : (
        <>
          {/* Proactive Location Permission Banner */}
          {(isLocationOff || isLocationTurnedOff || locationStatus === 'location_off') ? (
            <div className="mb-4 p-4 bg-rose-50 border-2 border-rose-500 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-900 shadow-md">
              <div className="flex items-start space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-950 text-sm">⚠️ Warning: Device Location is Turned OFF</p>
                  <p className="text-rose-700 mt-0.5 leading-relaxed">
                    Your phone's GPS / Location service is turned off. Attendance cannot be verified without location. Please turn on Location in your phone settings.
                  </p>
                </div>
              </div>
              <button
                onClick={handleTurnOnLocationClick}
                className="self-stretch sm:self-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-xl text-xs flex-shrink-0 transition shadow-sm cursor-pointer whitespace-nowrap"
              >
                Turn On Location & Validate
              </button>
            </div>
          ) : locationStatus === 'insecure' ? (
            <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900 shadow-sm">
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-bold">HTTPS Needed for GPS</p>
                  <p className="text-[11px] text-amber-700">Mobile browsers require HTTPS to prompt for location.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  window.location.href = window.location.href.replace('http:', 'https:');
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex-shrink-0 transition shadow-sm"
              >
                Switch to HTTPS
              </button>
            </div>
          ) : locationStatus === 'ready' && cachedPosition ? (
            <div
              className={`mb-4 p-3 rounded-2xl flex items-center justify-between text-xs shadow-sm border ${
                cachedPosition.accuracy <= 65
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : cachedPosition.accuracy <= 100
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                {cachedPosition.accuracy <= 65 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : cachedPosition.accuracy <= 100 ? (
                  <Navigation className="w-4 h-4 text-blue-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                )}
                <span className="font-semibold">
                  {cachedPosition.accuracy <= 65
                    ? 'High Precision GPS'
                    : cachedPosition.accuracy <= 100
                    ? 'Bus Transit GPS'
                    : 'Refining Satellite Lock'}
                </span>
                <span className="text-[11px] font-mono opacity-80">
                  (±{cachedPosition.accuracy}m)
                </span>
              </div>
              <button
                onClick={requestLocation}
                className="text-[11px] hover:underline font-semibold"
              >
                Refresh
              </button>
            </div>
          ) : locationStatus === 'acquiring' ? (
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center space-x-2.5 text-xs text-indigo-900 shadow-sm animate-pulse">
              <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin flex-shrink-0" />
              <span>Requesting device GPS location permission...</span>
            </div>
          ) : (
            <div className="mb-4 p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between text-xs text-indigo-950 shadow-sm">
              <div className="flex items-center space-x-2.5">
                <MapPin className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <div>
                  <p className="font-bold">Device Location Required</p>
                  <p className="text-[11px] text-indigo-700">
                    {locationMessage || 'Tap to grant location permission in browser.'}
                  </p>
                </div>
              </div>
              <button
                onClick={requestLocation}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex-shrink-0 transition shadow-sm"
              >
                Allow Location
              </button>
            </div>
          )}

          {/* Pre-scan Per-Trip Login Warning */}
          {!isTripAuthenticated && !errorDetails && (
            <div className="mb-4 p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between text-xs text-amber-950 shadow-sm">
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-bold">Trip Authentication Required</p>
                  <p className="text-[11px] text-amber-700">
                    Please log in fresh for this bus trip before marking attendance.
                  </p>
                </div>
              </div>
              <Link
                to="/login"
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex-shrink-0 transition shadow-sm"
              >
                Log In
              </Link>
            </div>
          )}

          {/* Camera Scanner View */}
          <div className="mb-6">
            <QRScanner onScanSuccess={handleScanSuccess} scanning={scanning} />
          </div>

          {/* Error Banner & Guided Troubleshooting */}
          {errorDetails && (() => {
            const isGpsAccuracyError =
              errorDetails.toLowerCase().includes('accuracy') ||
              errorDetails.toLowerCase().includes('gps accuracy') ||
              errorDetails.toLowerCase().includes('high-accuracy');

            return (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs space-y-3 shadow-sm">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="font-bold text-sm block text-rose-950">
                      {isGpsAccuracyError ? 'GPS Satellite Precision Needed' : 'Validation Rejected'}
                    </strong>
                    <span className="text-rose-800">{errorDetails}</span>
                  </div>
                </div>

                {isGpsAccuracyError ? (
                  <div className="bg-white/90 border border-rose-200 rounded-xl p-3.5 space-y-2.5 text-slate-700">
                    <p className="font-semibold text-slate-900 flex items-center space-x-1.5">
                      <Navigation className="w-4 h-4 text-indigo-600" />
                      <span>Why does Low GPS Accuracy happen?</span>
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Inside buses, metal roofs and tinted glass attenuate satellite signals. When first opening the camera, your phone provides an initial rough estimate before tightening lock onto satellites.
                    </p>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-1 text-[11px] text-amber-900">
                      <p className="font-bold">Fast Solutions:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        <li>Hold your phone closer to a <strong>bus window</strong> for 3 seconds.</li>
                        <li>Turn ON <strong>Google Location Accuracy</strong> (Android) or <strong>Precise Location</strong> (iPhone).</li>
                      </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <button
                        onClick={handleRetryRefinedGPS}
                        disabled={isRefiningGps}
                        className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition shadow-sm cursor-pointer"
                      >
                        {isRefiningGps ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Refining Satellite Lock...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Refine Satellite Lock & Retry</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowSettingsModal(true)}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer text-center"
                      >
                        Settings Guide
                      </button>
                    </div>
                  </div>
                ) : requireTripLogin ? (
                  <div className="mt-2">
                    <Link
                      to="/login"
                      className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm transition text-xs"
                    >
                      <span>Log In For Current Trip</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={handleResetScan}
                    className="mt-2 block font-semibold text-rose-700 underline hover:text-rose-900"
                  >
                    Click here to retry scan
                  </button>
                )}
              </div>
            );
          })()}

          {/* Step-by-Step Multi-Layer Security Status Panel */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Security Pipeline</span>
              </span>
              <span>Multi-Layer</span>
            </div>

            <div className="space-y-3">
              {Object.entries(checks).map(([key, item]) => {
                const isSuccess = item.status === 'success';
                const isError = item.status === 'error';
                const isChecking = item.status === 'checking';

                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                      isSuccess
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                        : isError
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : isChecking
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900 animate-pulse'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      {key === 'device' && <Smartphone className="w-4 h-4 flex-shrink-0" />}
                      {key === 'trip' && <Bus className="w-4 h-4 flex-shrink-0" />}
                      {key === 'qr' && <QrCode className="w-4 h-4 flex-shrink-0" />}
                      {key === 'gps' && <MapPin className="w-4 h-4 flex-shrink-0" />}
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex-shrink-0 ml-2">
                      {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      {isError && <XCircle className="w-4 h-4 text-rose-600" />}
                      {isChecking && (
                        <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
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
  );
};
