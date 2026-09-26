import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import { StatusBadge } from '../../components/StatusBadge';
import {
  QrCode,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Percent,
  Bus,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Navigation,
} from 'lucide-react';
import { getCurrentPosition, isLocationOffError, openDeviceLocationSettings, forceEnableLocation } from '../../utils/geolocation';
import { LocationSettingsModal } from '../../components/LocationSettingsModal';

export const StudentDashboard = () => {
  const {
    user,
    student,
    deviceIdentifier,
    studentCoords,
    studentGpsStatus,
    isTripAuthenticated,
    isLocationTurnedOff,
    setIsLocationTurnedOff,
    turnOnLocation,
  } = useAuth();
  const [activeTrip, setActiveTrip] = useState(null);
  const [markedForActiveTrip, setMarkedForActiveTrip] = useState(false);
  const [activeTripRecord, setActiveTripRecord] = useState(null);
  const [myAttendance, setMyAttendance] = useState({ history: [], stats: {} });
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  // Per-trip GPS location permission & validation states
  const [isValidatingGps, setIsValidatingGps] = useState(false);
  const [gpsValidationResult, setGpsValidationResult] = useState(null);
  const [locationWarning, setLocationWarning] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const [tripRes, historyRes, todayRes] = await Promise.all([
        axiosClient.get('/api/trips/active'),
        axiosClient.get('/api/attendance/my'),
        axiosClient.get('/api/attendance/today'),
      ]);

      if (tripRes.data.success && tripRes.data.active && tripRes.data.trip) {
        setActiveTrip(tripRes.data.trip);
        setMarkedForActiveTrip(Boolean(tripRes.data.markedByMe));
        setActiveTripRecord(tripRes.data.myRecord || null);
      } else {
        setActiveTrip(null);
        setMarkedForActiveTrip(false);
        setActiveTripRecord(null);
      }

      if (historyRes.data.success) {
        setMyAttendance(historyRes.data);
      }

      if (todayRes.data.success && todayRes.data.records.length > 0) {
        setTodayRecord(todayRes.data.records[0]);
      } else {
        setTodayRecord(null);
      }
    } catch (err) {
      console.error('Error fetching student dashboard info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
    const interval = setInterval(fetchStudentData, 10000);
    return () => clearInterval(interval);
  }, []);

  const isPresentToday = todayRecord && (todayRecord.status === 'PRESENT' || todayRecord.status === 'LATE');

  const validateTripLocation = async () => {
    setIsValidatingGps(true);
    setLocationWarning(null);
    try {
      const pos = turnOnLocation ? await turnOnLocation() : await forceEnableLocation();
      setGpsValidationResult({
        success: true,
        coords: pos,
        message: `Validated (±${pos.accuracy}m accuracy)`,
      });
      if (setIsLocationTurnedOff) {
        setIsLocationTurnedOff(false);
      }
      setLocationWarning(null);
      setShowSettingsModal(false);
      if (activeTrip?._id) {
        sessionStorage.setItem(`smart_bus_trip_gps_validated_${activeTrip._id}`, 'true');
      }
    } catch (err) {
      console.warn('[Trip GPS Validation Warning]', err);
      const isOff = isLocationOffError(err);
      if (isOff && setIsLocationTurnedOff) {
        setIsLocationTurnedOff(true);
      }
      setLocationWarning(
        isOff
          ? 'Device Location / GPS is turned OFF. Please turn on Location in your phone settings.'
          : (err.message || 'Unable to acquire accurate GPS coordinates.')
      );
      setGpsValidationResult({
        success: false,
        error: err.message,
      });
    } finally {
      setIsValidatingGps(false);
    }
  };

  const handleTurnOnLocationClick = async () => {
    setIsValidatingGps(true);
    setLocationWarning(null);

    try {
      // Calling turnOnLocation will prompt the browser's location permission dialog
      const pos = await turnOnLocation();
      setGpsValidationResult({
        success: true,
        coords: pos,
        message: `Validated (±${pos.accuracy}m accuracy)`,
      });
      if (setIsLocationTurnedOff) {
        setIsLocationTurnedOff(false);
      }
      setLocationWarning(null);
      setShowSettingsModal(false);

      if (activeTrip?._id) {
        sessionStorage.setItem(`smart_bus_trip_gps_validated_${activeTrip._id}`, 'true');
      }
    } catch (err) {
      console.warn('[handleTurnOnLocationClick Error]', err);
      setLocationWarning(err.message || 'Location permission was denied or device GPS is off.');
      setShowSettingsModal(true);
    } finally {
      setIsValidatingGps(false);
    }
  };

  // Prompt location permission and validate GPS on every trip login
  useEffect(() => {
    if (activeTrip && isTripAuthenticated) {
      const tripKey = `smart_bus_trip_gps_validated_${activeTrip._id}`;
      const alreadyValidated = sessionStorage.getItem(tripKey) === 'true';
      if (!alreadyValidated && !isValidatingGps) {
        validateTripLocation();
      }
    }
  }, [activeTrip?._id, isTripAuthenticated]);

  return (
    <div className="min-h-screen bg-[#040806] text-slate-100 py-6 px-4 sm:px-6 relative overflow-hidden selection:bg-yellow-400 selection:text-slate-950">
      {/* Ambient Acid Cyber-Rave Glowing Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-yellow-400/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Student Profile Card */}
        <div className="bg-[#071911] border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 text-white shadow-2xl mb-6 relative overflow-hidden ring-1 ring-yellow-400/20">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-yellow-400 via-lime-300 to-emerald-400 shadow-[0_0_15px_#facc15]"></div>
          {/* Background watermark */}
          <Bus className="absolute -right-6 -bottom-6 w-44 h-44 text-emerald-500/5 pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 font-mono shadow-[0_0_10px_rgba(250,204,21,0.2)]">
                  {student?.rollNumber || 'STUDENT'}
                </span>
                <span className="text-xs font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {student?.year || '3rd Year'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {student?.name || user?.name}
              </h1>
              <p className="text-xs sm:text-sm text-emerald-200/80 mt-1">
                {student?.department || 'Computer Science & Engineering'}
              </p>
            </div>

            <div className="flex items-center space-x-4 bg-[#030d08] px-5 py-3 rounded-2xl border border-emerald-500/30 shadow-inner">
              <div className="text-center">
                <span className="text-[11px] uppercase font-bold text-emerald-400/80">Overall</span>
                <p className="text-2xl font-black font-mono text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.45)]">
                  {myAttendance.stats.percentage || student?.attendancePercentage || 0}%
                </p>
              </div>
              <div className="h-8 w-px bg-emerald-500/25"></div>
              <div className="text-center">
                <span className="text-[11px] uppercase font-bold text-emerald-400/80">Classes</span>
                <p className="text-2xl font-black font-mono text-emerald-300">
                  {myAttendance.stats.totalPresent || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Device Binding Pill */}
          <div className="mt-6 pt-4 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-200/80">
            <div className="flex items-center space-x-1.5">
              <Smartphone className="w-4 h-4 text-yellow-400" />
              <span>Bound Device: <strong className="font-mono text-white">{deviceIdentifier}</strong></span>
            </div>
            <span className="text-emerald-300 flex items-center space-x-1 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Hardware Verified</span>
            </span>
          </div>
        </div>

      {/* Warning Banner: Location Turned OFF */}
      {(isLocationTurnedOff || locationWarning) && (
        <div className="bg-rose-950/80 border-2 border-rose-500/80 rounded-3xl p-5 mb-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-400 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-7 h-7 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-300 bg-rose-900/80 px-2.5 py-0.5 rounded-full border border-rose-500/40">
                  ⚠️ Warning: Location Turned Off
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                Your Device Location / GPS is Turned OFF
              </h3>
              <p className="text-xs text-rose-200/80 mt-0.5 max-w-xl">
                {locationWarning || "Your phone's GPS or Location service is turned off. Bus attendance cannot be marked without live GPS verification. Please turn on Location in your device settings."}
              </p>
            </div>
          </div>
          <button
            onClick={handleTurnOnLocationClick}
            disabled={isValidatingGps}
            className="px-5 py-2.5 bg-gradient-to-r from-yellow-400 via-lime-300 to-yellow-400 hover:from-yellow-300 hover:to-lime-200 active:scale-95 text-slate-950 font-black rounded-2xl text-xs flex items-center space-x-2 shadow-lg shadow-yellow-500/20 border border-yellow-200 flex-shrink-0 transition cursor-pointer"
          >
            {isValidatingGps ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Requesting Browser Permission...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 text-slate-950" />
                <span>Turn On Location Services</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Status Banner: Validating Live GPS */}
      {isValidatingGps && (
        <div className="bg-[#071911] border-2 border-yellow-400/70 rounded-3xl p-5 mb-6 shadow-xl flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-yellow-400/20 text-yellow-300 flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-5 h-5 text-yellow-300 animate-spin" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Validating Live GPS Location for {activeTrip?.sessionName || 'Active Bus Trip'}...
              </h4>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Acquiring high-accuracy satellite coordinates to confirm bus transit geofence.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-mono font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/40">
            Validating...
          </span>
        </div>
      )}

      {/* Live Continuous GPS & Trip Authentication Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Live Student GPS Card */}
        <div className={`p-5 rounded-3xl border-2 shadow-xl flex items-center justify-between ${
          isLocationTurnedOff || locationWarning
            ? 'bg-rose-950/60 border-rose-500/70'
            : isValidatingGps
            ? 'bg-[#071911] border-yellow-400/70'
            : 'bg-[#071911] border-emerald-500/40 hover:border-yellow-400/60 transition-all'
        }`}>
          <div className="flex items-center space-x-3.5 truncate">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              isLocationTurnedOff || locationWarning
                ? 'bg-rose-500/20 text-rose-400 border border-rose-400/40'
                : isValidatingGps
                ? 'bg-yellow-400/20 text-yellow-300'
                : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
            }`}>
              {isLocationTurnedOff || locationWarning ? (
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              ) : isValidatingGps ? (
                <RefreshCw className="w-6 h-6 text-yellow-300 animate-spin" />
              ) : (
                <Navigation className="w-6 h-6 text-emerald-400 animate-pulse" />
              )}
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-black uppercase tracking-wider ${
                  isLocationTurnedOff || locationWarning ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  Live Student GPS
                </span>
                {!(isLocationTurnedOff || locationWarning) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                )}
              </div>
              <p className={`text-xs font-bold mt-0.5 truncate ${
                isLocationTurnedOff || locationWarning ? 'text-rose-200' : 'text-white'
              }`}>
                {isLocationTurnedOff || locationWarning
                  ? '⚠️ Device Location is OFF'
                  : isValidatingGps
                  ? 'Validating Live GPS...'
                  : (studentGpsStatus || 'Live GPS Active (Updated Every 1s)')}
              </p>
              <p className={`text-[11px] font-mono mt-0.5 truncate ${
                isLocationTurnedOff || locationWarning ? 'text-rose-300' : 'text-yellow-300/90'
              }`}>
                {isLocationTurnedOff || locationWarning
                  ? 'Tap button to turn ON location'
                  : studentCoords?.latitude
                  ? `${studentCoords.latitude.toFixed(5)}, ${studentCoords.longitude.toFixed(5)}${studentCoords.accuracy ? ` (±${Math.round(studentCoords.accuracy)}m)` : ''}`
                  : 'Streaming high-accuracy 1s GPS...'}
              </p>
            </div>
          </div>
          {isLocationTurnedOff || locationWarning ? (
            <button
              onClick={handleTurnOnLocationClick}
              disabled={isValidatingGps}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-yellow-400 to-amber-300 text-slate-950 flex-shrink-0 transition shadow-md cursor-pointer"
            >
              Turn On Location Services
            </button>
          ) : (
            <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 flex-shrink-0">
              Never Locked
            </span>
          )}
        </div>

        {/* Per-Trip Authentication Status */}
        <div className="bg-[#071911] p-5 rounded-3xl border-2 border-emerald-500/40 shadow-xl flex items-center justify-between">
          <div className="flex items-center space-x-3.5 truncate">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              activeTrip && !isTripAuthenticated ? 'bg-amber-500/20 text-amber-400 border border-amber-400/40' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="truncate">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400/80">Trip Authentication</span>
              <p className="text-xs font-bold text-white mt-0.5 truncate">
                {activeTrip
                  ? (isTripAuthenticated ? `${activeTrip.sessionName || 'Active Trip'} Authenticated` : 'Re-login Required')
                  : 'Ready for Departure'}
              </p>
              <p className="text-[11px] text-emerald-200/70 mt-0.5 truncate">
                {activeTrip
                  ? (isTripAuthenticated ? 'Valid session for active trip' : 'Log in fresh for this active trip')
                  : 'Per-trip login required on trip start'}
              </p>
            </div>
          </div>
          {activeTrip && !isTripAuthenticated ? (
            <Link
              to="/login"
              className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 text-xs font-black rounded-xl transition shadow-md flex-shrink-0"
            >
              Log In For Trip
            </Link>
          ) : (
            <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 flex-shrink-0">
              Verified
            </span>
          )}
        </div>
      </div>

      {/* Session / Active Trip Status Banner & Call to Action */}
      <div className="mb-6">
        {activeTrip ? (
          markedForActiveTrip ? (
            <div className="bg-[#061e14] border-2 border-emerald-400/70 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/50 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Attendance Marked for {activeTrip.session === 'MORNING' ? '🌅 Morning' : '🌆 Evening'} Trip
                  </h3>
                  <p className="text-xs text-emerald-300 mt-0.5">
                    Verified on {activeTrip.busId?.busNumber || 'BUS-09'} • Distance: {activeTripRecord?.distanceMeters || 0}m
                  </p>
                </div>
              </div>
              <StatusBadge status="PRESENT" />
            </div>
          ) : !isTripAuthenticated ? (
            <div className="bg-[#1F1705] border-2 border-amber-400 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-yellow-400 mb-1">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    {activeTrip.sessionName || 'Trip'} Active — Authentication Required
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">
                  Please Log In for This Trip
                </h3>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  As required by bus security policy, you must log in fresh for each trip before scanning attendance.
                </p>
              </div>

              <Link
                to="/login"
                className="px-6 py-3 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 text-slate-950 font-black rounded-2xl text-sm transition shadow-lg shadow-yellow-500/20 flex items-center justify-center space-x-2 flex-shrink-0"
              >
                <span>Log In For Trip</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="bg-[#071911] border-2 border-yellow-400 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 ring-1 ring-lime-400/40">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-400 via-lime-300 to-yellow-400 shadow-[0_0_15px_#facc15]"></div>
              <div>
                <div className="flex items-center space-x-2 text-yellow-400 mb-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping"></span>
                  <span className="text-xs font-black uppercase tracking-wider">
                    {activeTrip.session === 'MORNING' ? '🌅 Morning' : '🌆 Evening'} Trip In Progress
                  </span>
                </div>
                <h3 className="text-xl font-black text-white">
                  {activeTrip.sessionName || 'Trip'} Attendance is Open!
                </h3>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  Scan the dynamic QR displayed on the bus dashboard to mark your presence.
                </p>
              </div>

              <Link
                to="/student/scan"
                className="px-7 py-3.5 bg-gradient-to-r from-yellow-400 via-lime-300 to-yellow-400 hover:from-yellow-300 hover:to-lime-200 active:scale-95 text-slate-950 font-black rounded-2xl text-sm transition shadow-[0_0_25px_rgba(250,204,21,0.45)] border border-yellow-200 flex items-center justify-center space-x-2 flex-shrink-0"
              >
                <QrCode className="w-5 h-5 text-slate-950" />
                <span>Scan QR Code</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </Link>
            </div>
          )
        ) : isPresentToday ? (
          <div className="bg-[#061e14] border-2 border-emerald-500/50 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Clock className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Trip Ended • Attendance Closed</h3>
                <p className="text-xs text-emerald-300 mt-0.5">
                  Last marked at {new Date(todayRecord.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Waiting for next bus trip to start.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/40">
              Trip Completed
            </span>
          </div>
        ) : (
          <div className="bg-[#071911] rounded-3xl border-2 border-emerald-500/30 p-6 text-center text-emerald-300/70 shadow-lg">
            <Clock className="w-8 h-8 mx-auto text-emerald-400 mb-2 opacity-80" />
            <h3 className="text-sm font-bold text-white">Attendance is Currently Closed</h3>
            <p className="text-xs text-emerald-300/70 mt-0.5">
              The driver has not started a bus trip yet or the trip has ended. Check back when boarding the bus.
            </p>
          </div>
        )}
      </div>

      {/* Attendance History Section */}
      <div className="bg-[#071911] rounded-3xl border-2 border-emerald-500/40 shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-emerald-500/20 flex items-center justify-between bg-[#040E0A]">
          <div>
            <h3 className="text-base font-bold text-white">My Attendance History</h3>
            <p className="text-xs text-emerald-300/70">Personal boarding and verification logs</p>
          </div>
          <button
            onClick={fetchStudentData}
            className="p-1.5 text-emerald-400 hover:text-yellow-400 rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="divide-y divide-emerald-500/15">
          {myAttendance.history.length === 0 ? (
            <div className="py-12 text-center text-emerald-300/60 text-xs">
              No attendance records recorded yet.
            </div>
          ) : (
            myAttendance.history.map((rec) => (
              <div key={rec._id} className="p-4 sm:px-6 hover:bg-emerald-950/40 transition flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white">
                      {new Date(rec.markedAt).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-xs text-yellow-400 font-mono">
                      at {new Date(rec.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-300/70 mt-0.5">
                    Trip: <span className="font-mono text-emerald-200">{rec.tripId?.tripId || 'TRIP'}</span> • Dist from bus: {rec.distanceMeters || 0}m
                  </div>
                </div>

                <StatusBadge status={rec.status} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Location Settings & Turn On Guide Modal */}
      <LocationSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onValidate={validateTripLocation}
        isValidating={isValidatingGps}
        validationError={locationWarning}
      />
      </div>
    </div>
  );
};
