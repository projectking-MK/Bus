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
import { getCurrentPosition, isLocationOffError } from '../../utils/geolocation';

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
      const pos = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 5000,
      });
      setGpsValidationResult({
        success: true,
        coords: pos,
        message: `Validated (±${pos.accuracy}m accuracy)`,
      });
      if (setIsLocationTurnedOff) {
        setIsLocationTurnedOff(false);
      }
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Student Profile Card */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-6 relative overflow-hidden">
        {/* Background watermark */}
        <Bus className="absolute -right-6 -bottom-6 w-44 h-44 text-white/5 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-white/20 text-white border border-white/20 font-mono">
                {student?.rollNumber || 'STUDENT'}
              </span>
              <span className="text-xs text-indigo-200">
                {student?.year || '3rd Year'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {student?.name || user?.name}
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 mt-1">
              {student?.department || 'Computer Science & Engineering'}
            </p>
          </div>

          <div className="flex items-center space-x-4 bg-white/10 backdrop-blur px-5 py-3 rounded-2xl border border-white/15">
            <div className="text-center">
              <span className="text-[11px] uppercase font-semibold text-indigo-200">Overall</span>
              <p className="text-2xl font-black font-mono text-emerald-400">
                {myAttendance.stats.percentage || student?.attendancePercentage || 0}%
              </p>
            </div>
            <div className="h-8 w-px bg-white/20"></div>
            <div className="text-center">
              <span className="text-[11px] uppercase font-semibold text-indigo-200">Classes</span>
              <p className="text-2xl font-black font-mono text-white">
                {myAttendance.stats.totalPresent || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Device Binding Pill */}
        <div className="mt-6 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-200">
          <div className="flex items-center space-x-1.5">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Bound Device: <strong className="font-mono text-white">{deviceIdentifier}</strong></span>
          </div>
          <span className="text-emerald-300 flex items-center space-x-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Hardware Verified</span>
          </span>
        </div>
      </div>

      {/* Warning Banner: Location Turned OFF */}
      {(isLocationTurnedOff || locationWarning) && (
        <div className="bg-rose-50 border-2 border-rose-500 rounded-3xl p-5 mb-6 shadow-lg shadow-rose-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-7 h-7 text-rose-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                  ⚠️ Warning: Location Turned Off
                </span>
              </div>
              <h3 className="text-base font-bold text-rose-950 mt-1">
                Your Device Location / GPS is Turned OFF
              </h3>
              <p className="text-xs text-rose-700 mt-0.5 max-w-xl">
                {locationWarning || "Your phone's GPS or Location service is turned off. Bus attendance cannot be marked without live GPS verification. Please turn on Location in your device settings."}
              </p>
            </div>
          </div>
          <button
            onClick={validateTripLocation}
            disabled={isValidatingGps}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-2xl text-xs flex items-center space-x-2 shadow-md shadow-rose-200 flex-shrink-0 transition cursor-pointer"
          >
            <Navigation className="w-4 h-4" />
            <span>{isValidatingGps ? 'Validating...' : 'Turn On Location & Validate'}</span>
          </button>
        </div>
      )}

      {/* Status Banner: Validating Live GPS */}
      {isValidatingGps && (
        <div className="bg-indigo-50 border-2 border-indigo-400 rounded-3xl p-5 mb-6 shadow-md shadow-indigo-100 flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-indigo-950">
                Validating Live GPS Location for {activeTrip?.sessionName || 'Active Bus Trip'}...
              </h4>
              <p className="text-xs text-indigo-700 mt-0.5">
                Acquiring high-accuracy satellite coordinates to confirm bus transit geofence.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-mono font-bold bg-white text-indigo-600 border border-indigo-200">
            Validating...
          </span>
        </div>
      )}

      {/* Live Continuous GPS & Trip Authentication Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Live Student GPS Card (Updated Every 1s, Never Locked) */}
        <div className={`p-5 rounded-3xl border shadow-sm flex items-center justify-between ${
          isLocationTurnedOff || locationWarning
            ? 'bg-rose-50/60 border-rose-300'
            : isValidatingGps
            ? 'bg-indigo-50/60 border-indigo-300'
            : 'bg-white border-slate-200/80'
        }`}>
          <div className="flex items-center space-x-3.5 truncate">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              isLocationTurnedOff || locationWarning
                ? 'bg-rose-100 text-rose-600'
                : isValidatingGps
                ? 'bg-indigo-100 text-indigo-600'
                : 'bg-indigo-50 text-indigo-600'
            }`}>
              {isLocationTurnedOff || locationWarning ? (
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              ) : isValidatingGps ? (
                <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
              ) : (
                <Navigation className="w-6 h-6 text-indigo-600 animate-pulse" />
              )}
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  isLocationTurnedOff || locationWarning ? 'text-rose-700' : 'text-indigo-600'
                }`}>
                  Live Student GPS
                </span>
                {!(isLocationTurnedOff || locationWarning) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                )}
              </div>
              <p className={`text-xs font-bold mt-0.5 truncate ${
                isLocationTurnedOff || locationWarning ? 'text-rose-900' : 'text-slate-800'
              }`}>
                {isLocationTurnedOff || locationWarning
                  ? '⚠️ Device Location is OFF'
                  : isValidatingGps
                  ? 'Validating Live GPS...'
                  : (studentGpsStatus || 'Live GPS Active (Updated Every 1s)')}
              </p>
              <p className={`text-[11px] font-mono mt-0.5 truncate ${
                isLocationTurnedOff || locationWarning ? 'text-rose-700' : 'text-slate-500'
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
              onClick={validateTripLocation}
              disabled={isValidatingGps}
              className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white flex-shrink-0 transition shadow-sm"
            >
              Validate
            </button>
          ) : (
            <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-100 flex-shrink-0">
              Never Locked
            </span>
          )}
        </div>

        {/* Per-Trip Authentication Status */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-3.5 truncate">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              activeTrip && !isTripAuthenticated ? 'bg-amber-100 text-amber-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="truncate">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Trip Authentication</span>
              <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                {activeTrip
                  ? (isTripAuthenticated ? `${activeTrip.sessionName || 'Active Trip'} Authenticated` : 'Re-login Required')
                  : 'Ready for Departure'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {activeTrip
                  ? (isTripAuthenticated ? 'Valid session for active trip' : 'Log in fresh for this active trip')
                  : 'Per-trip login required on trip start'}
              </p>
            </div>
          </div>
          {activeTrip && !isTripAuthenticated ? (
            <Link
              to="/login"
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition shadow-sm flex-shrink-0"
            >
              Log In For Trip
            </Link>
          ) : (
            <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 flex-shrink-0">
              Verified
            </span>
          )}
        </div>
      </div>

      {/* Session / Active Trip Status Banner & Call to Action */}
      <div className="mb-6">
        {activeTrip ? (
          markedForActiveTrip ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-900">
                    Attendance Marked for {activeTrip.session === 'MORNING' ? '🌅 Morning' : '🌆 Evening'} Trip
                  </h3>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Verified on {activeTrip.busId?.busNumber || 'BUS-09'} • Distance: {activeTripRecord?.distanceMeters || 0}m
                  </p>
                </div>
              </div>
              <StatusBadge status="PRESENT" />
            </div>
          ) : !isTripAuthenticated ? (
            <div className="bg-amber-50 border-2 border-amber-400 rounded-3xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-amber-700 mb-1">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {activeTrip.sessionName || 'Trip'} Active — Authentication Required
                  </span>
                </div>
                <h3 className="text-lg font-bold text-amber-950">
                  Please Log In for This Trip
                </h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  As required by bus security policy, you must log in fresh for each trip before scanning attendance.
                </p>
              </div>

              <Link
                to="/login"
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-sm transition shadow-md shadow-amber-200 flex items-center justify-center space-x-2 flex-shrink-0"
              >
                <span>Log In For Trip</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="bg-white border-2 border-indigo-500 rounded-3xl p-6 shadow-lg shadow-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-indigo-600 mb-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {activeTrip.session === 'MORNING' ? '🌅 Morning' : '🌆 Evening'} Trip In Progress
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {activeTrip.sessionName || 'Trip'} Attendance is Open!
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scan the dynamic QR displayed on the bus dashboard to mark your presence.
                </p>
              </div>

              <Link
                to="/student/scan"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm transition shadow-md shadow-indigo-200 flex items-center justify-center space-x-2"
              >
                <QrCode className="w-5 h-5" />
                <span>Scan QR Code</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )
        ) : isPresentToday ? (
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Trip Ended • Attendance Closed</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Last marked at {new Date(todayRecord.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Waiting for next bus trip to start.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-slate-200 text-slate-700">
              Trip Completed
            </span>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 text-center text-slate-500">
            <Clock className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <h3 className="text-sm font-bold text-slate-800">Attendance is Currently Closed</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              The driver has not started a bus trip yet or the trip has ended. Check back when boarding the bus.
            </p>
          </div>
        )}
      </div>

      {/* Attendance History Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">My Attendance History</h3>
            <p className="text-xs text-slate-500">Personal boarding and verification logs</p>
          </div>
          <button
            onClick={fetchStudentData}
            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {myAttendance.history.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No attendance records recorded yet.
            </div>
          ) : (
            myAttendance.history.map((rec) => (
              <div key={rec._id} className="p-4 sm:px-6 hover:bg-slate-50/80 transition flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-800">
                      {new Date(rec.markedAt).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      at {new Date(rec.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Trip: <span className="font-mono">{rec.tripId?.tripId || 'TRIP'}</span> • Dist from bus: {rec.distanceMeters || 0}m
                  </div>
                </div>

                <StatusBadge status={rec.status} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
