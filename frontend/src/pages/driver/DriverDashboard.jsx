import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import { DynamicQRDisplay } from '../../components/DynamicQRDisplay';
import { StatusBadge } from '../../components/StatusBadge';
import { getCurrentPosition } from '../../utils/geolocation';
import {
  Bus,
  Play,
  Square,
  Users,
  UserCheck,
  UserX,
  MapPin,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertCircle,
  Navigation,
  Sliders,
  X,
} from 'lucide-react';

const GPS_RANGE_OPTIONS = [
  {
    value: 100,
    label: '100 Meter',
    name: '100m Doorstep / Boarding Geofence',
    badge: 'Strict Proximity',
    color: 'emerald',
    description: 'Students must be standing immediately beside or inside the bus (within 100 meters). Strict anti-proxy enforcement.',
  },
  {
    value: 3000,
    label: '3 Kilometer',
    name: '3km Local Route & Stop Vicinity',
    badge: 'Local Stops',
    color: 'indigo',
    description: 'Permits students waiting at nearby intersections, shelters, and designated local bus stops within a 3km radius.',
  },
  {
    value: 10000,
    label: '10 Kilometer',
    name: '10km Extended Route & Transit Zone',
    badge: 'Extended Transit',
    color: 'blue',
    description: 'Permits students boarding along moving routes, suburban stops, and connecting junctions within a 10km radius.',
  },
  {
    value: 100000,
    label: '100 Kilometer',
    name: '100km District Transit Corridor',
    badge: 'Inter-City Transit',
    color: 'purple',
    description: 'Permits students boarding along highway stretches, long-distance college transit lines, and regional corridors within 100km.',
  },
];

export const DriverDashboard = () => {
  const { user } = useAuth();
  const [activeTrip, setActiveTrip] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 55,
    presentCount: 0,
    absentCount: 55,
    totalBoys: 21,
    totalGirls: 34,
    boysPresent: 0,
    girlsPresent: 0,
    boysAbsent: 21,
    girlsAbsent: 34,
  });
  const [genderFilter, setGenderFilter] = useState('ALL'); // 'ALL' | 'BOYS' | 'GIRLS'
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Standby');
  const [currentCoords, setCurrentCoords] = useState(null);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(() => {
    return new Date().getHours() < 13 ? 'MORNING' : 'EVENING';
  });
  const [selectedGpsRange, setSelectedGpsRange] = useState(3000);
  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
  const [isAdjustRangeModalOpen, setIsAdjustRangeModalOpen] = useState(false);

  const locationWatchRef = useRef(null);
  const wakeLockRef = useRef(null);
  const audioRef = useRef(null);
  const workerRef = useRef(null);
  const coordsRef = useRef(null);

  const fetchActiveTrip = async () => {
    try {
      setError(null);
      const res = await axiosClient.get('/api/trips/active');
      if (res.data.success) {
        if (res.data.active && res.data.trip) {
          setActiveTrip(res.data.trip);
          if (res.data.trip.geofenceRadius) {
            setSelectedGpsRange(res.data.trip.geofenceRadius);
          }
          if (res.data.stats) {
            setStats((prev) => ({ ...prev, ...res.data.stats }));
          }
          // Also fetch attendees
          fetchAttendees();
        } else {
          setActiveTrip(null);
          setAttendees([]);
        }
      }
    } catch (err) {
      console.error('Error fetching active trip:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendees = async () => {
    try {
      const res = await axiosClient.get('/api/attendance/active-trip');
      if (res.data.success) {
        setAttendees(res.data.records || []);
        if (res.data.stats) {
          setStats((prev) => ({ ...prev, ...res.data.stats }));
        }
      }
    } catch (err) {
      console.error('Error fetching attendees:', err);
    }
  };

  useEffect(() => {
    fetchActiveTrip();
    const interval = setInterval(() => {
      fetchActiveTrip();
    }, 10000); // 10s poll for passenger count
    return () => clearInterval(interval);
  }, []);

  // GPS location streaming for active trip - with Mobile Background Running Engine
  useEffect(() => {
    let watchId = null;
    let intervalId = null;
    let isBroadcasting = false;

    if (activeTrip) {
      setLocationStatus('Broadcasting Live GPS...');

      const sendLocationUpdate = async (lat, lon, accuracy) => {
        if (isBroadcasting) return;
        isBroadcasting = true;
        try {
          await axiosClient.post('/api/trips/location', {
            latitude: lat,
            longitude: lon,
          });
          const update = {
            latitude: lat,
            longitude: lon,
            accuracy: accuracy || null,
            updatedAt: new Date(),
          };
          setCurrentCoords(update);
          coordsRef.current = update;
          setLocationStatus('Live & Background GPS Active');
        } catch (e) {
          setLocationStatus('Retrying Live GPS...');
        } finally {
          isBroadcasting = false;
        }
      };

      let lastSendTime = 0;
      const sendLocationUpdateThrottled = (lat, lon, accuracy) => {
        const now = Date.now();
        if (now - lastSendTime < 2000) return;
        lastSendTime = now;
        sendLocationUpdate(lat, lon, accuracy);
      };

      // 1. Mobile Screen Wake Lock: prevents mobile screen from sleeping during active trips
      const requestWakeLock = async () => {
        if ('wakeLock' in navigator && !wakeLockRef.current && typeof document !== 'undefined' && document.visibilityState === 'visible') {
          try {
            wakeLockRef.current = await navigator.wakeLock.request('screen');
            wakeLockRef.current.addEventListener('release', () => {
              wakeLockRef.current = null;
            });
          } catch (err) {
            console.warn('[WakeLock] Unable to acquire wake lock:', err.message);
          }
        }
      };
      requestWakeLock();

      // 2. Mobile Silent Audio Keep-Alive: prevents OS from freezing browser process when switching apps
      try {
        if (!audioRef.current && typeof Audio !== 'undefined') {
          const silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
          const audio = new Audio(silentWav);
          audio.loop = true;
          audio.volume = 0.01;
          const p = audio.play();
          if (p && typeof p.catch === 'function') p.catch(() => {});
          audioRef.current = audio;
        }
      } catch (_) {}

      // 3. Inline Web Worker: generates background ticks even when mobile browser tab is hidden
      try {
        if (!workerRef.current && typeof Worker !== 'undefined' && typeof Blob !== 'undefined') {
          const workerScript = `
            let timer = null;
            self.onmessage = function(e) {
              if (e.data === 'start') {
                if (timer) clearInterval(timer);
                timer = setInterval(function() {
                  self.postMessage('tick');
                }, 4000);
              } else if (e.data === 'stop') {
                if (timer) clearInterval(timer);
                timer = null;
              }
            };
          `;
          const blob = new Blob([workerScript], { type: 'application/javascript' });
          const workerUrl = URL.createObjectURL(blob);
          const worker = new Worker(workerUrl);
          worker.onmessage = () => {
            if (navigator?.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => sendLocationUpdateThrottled(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
                () => {},
                { enableHighAccuracy: true, maximumAge: 15000, timeout: 5000 }
              );
            }
          };
          worker.postMessage('start');
          workerRef.current = worker;
        }
      } catch (_) {}

      // 4. Visibility change & focus listeners
      const handleVisibilityChange = () => {
        if (typeof document === 'undefined') return;
        if (document.hidden) {
          // Driver came out from webpage: immediately snapshot location
          if (navigator?.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => sendLocationUpdateThrottled(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
              () => {},
              { enableHighAccuracy: true, maximumAge: 15000, timeout: 5000 }
            );
          }
        } else {
          // Driver returned to webpage: re-acquire wake lock and fetch fresh coordinates
          requestWakeLock();
          if (navigator?.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => sendLocationUpdateThrottled(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
              () => {},
              { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 }
            );
          }
        }
      };

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }
      if (typeof window !== 'undefined') {
        window.addEventListener('focus', requestWakeLock);
      }

      // 5. Geolocation watchPosition
      if (navigator?.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            sendLocationUpdateThrottled(latitude, longitude, accuracy);
          },
          (err) => {
            console.warn('[Driver GPS Watch Warning]', err.message);
            setLocationStatus('GPS Warning (Check permissions)');
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
        );

        // Periodic fallback timer
        intervalId = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude, accuracy } = pos.coords;
              sendLocationUpdateThrottled(latitude, longitude, accuracy);
            },
            (err) => {
              console.warn('[Driver GPS Interval Warning]', err.message);
            },
            { enableHighAccuracy: true, maximumAge: 15000, timeout: 8000 }
          );
        }, 8000);
      }
    } else {
      setLocationStatus('Inactive');
    }

    return () => {
      if (watchId !== null && navigator?.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
      if (workerRef.current) {
        try {
          workerRef.current.postMessage('stop');
          workerRef.current.terminate();
        } catch (_) {}
        workerRef.current = null;
      }
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch (_) {}
        audioRef.current = null;
      }
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
        } catch (_) {}
        wakeLockRef.current = null;
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', () => {});
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', () => {});
      }
    };
  }, [activeTrip?.tripId]);

  const handleStartTrip = async (radiusOverride) => {
    const chosenRadius = radiusOverride !== undefined ? radiusOverride : selectedGpsRange;
    setActionLoading(true);
    setError(null);
    setIsGpsModalOpen(false);
    try {
      let initialLat = 13.0827;
      let initialLon = 80.2707;

      try {
        const pos = await getCurrentPosition({ enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 });
        initialLat = pos.latitude;
        initialLon = pos.longitude;
      } catch (gpsErr) {
        try {
          const raw = localStorage.getItem('smart_bus_last_gps');
          if (raw) {
            const saved = JSON.parse(raw);
            if (saved?.latitude) {
              initialLat = saved.latitude;
              initialLon = saved.longitude;
            }
          }
        } catch (_) {}
        console.warn('Could not acquire driver initial GPS immediately, using best known coordinates:', gpsErr.message);
      }

      const res = await axiosClient.post('/api/trips/start', {
        session: selectedSession,
        latitude: initialLat,
        longitude: initialLon,
        geofenceRadius: chosenRadius,
      });

      if (res.data.success) {
        setActiveTrip(res.data.trip);
        if (res.data.trip.geofenceRadius) {
          setSelectedGpsRange(res.data.trip.geofenceRadius);
        }
        setStats({
          totalStudents: 55,
          presentCount: 0,
          absentCount: 55,
          totalBoys: 21,
          totalGirls: 34,
          boysPresent: 0,
          girlsPresent: 0,
          boysAbsent: 21,
          girlsAbsent: 34,
        });
        setAttendees([]);

        // Immediately update with live location so starting coordinates are never locked
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              axiosClient.post('/api/trips/location', {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              }).catch(() => {});
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 30000, timeout: 8000 }
          );
        }

        fetchActiveTrip();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start trip.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRange = async (newRadius) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await axiosClient.patch('/api/trips/range', {
        geofenceRadius: newRadius,
      });
      if (res.data.success) {
        setSelectedGpsRange(newRadius);
        setActiveTrip((prev) => (prev ? { ...prev, geofenceRadius: newRadius } : null));
        setIsAdjustRangeModalOpen(false);
        fetchActiveTrip();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update GPS range.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopTrip = async () => {
    if (!window.confirm('Are you sure you want to stop the bus trip? Attendance will be closed.')) {
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const res = await axiosClient.post('/api/trips/stop');
      if (res.data.success) {
        setActiveTrip(null);
        setAttendees([]);
        setStats({
          totalStudents: 55,
          presentCount: 0,
          absentCount: 55,
          totalBoys: 21,
          totalGirls: 34,
          boysPresent: 0,
          girlsPresent: 0,
          boysAbsent: 21,
          girlsAbsent: 34,
        });
        // Auto toggle next session
        setSelectedSession((prev) => (prev === 'MORNING' ? 'EVENING' : 'MORNING'));
        const s = res.data.summary || {};
        alert(
          `Trip Completed!\n\n` +
          `Attendance is now CLOSED.\n` +
          `Total Boarded: ${s.presentCount || 0} / ${s.totalStudents || 55}\n` +
          `👦 Boys Present: ${s.boysPresent || 0} / ${s.totalBoys || 21}\n` +
          `👧 Girls Present: ${s.girlsPresent || 0} / ${s.totalGirls || 34}\n` +
          `Total Absent: ${s.absentCount || 0}`
        );
        fetchActiveTrip();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to stop trip.');
    } finally {
      setActionLoading(false);
    }
  };

  // Derive real-time boy and girl counts directly from attendees array or stats
  const boysInAttendees = attendees.filter((a) => a.studentId?.gender === 'Male').length;
  const girlsInAttendees = attendees.filter((a) => a.studentId?.gender === 'Female').length;

  const boysPresent = stats.boysPresent !== undefined && stats.boysPresent >= boysInAttendees ? stats.boysPresent : boysInAttendees;
  const girlsPresent = stats.girlsPresent !== undefined && stats.girlsPresent >= girlsInAttendees ? stats.girlsPresent : girlsInAttendees;
  const totalBoys = stats.totalBoys || 21;
  const totalGirls = stats.totalGirls || 34;
  const boysAbsent = Math.max(0, totalBoys - boysPresent);
  const girlsAbsent = Math.max(0, totalGirls - girlsPresent);

  const filteredAttendees = attendees.filter((rec) => {
    if (genderFilter === 'BOYS') return rec.studentId?.gender === 'Male';
    if (genderFilter === 'GIRLS') return rec.studentId?.gender === 'Female';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <Bus className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Driver Trip Console
            </h1>
            {activeTrip && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 ${
                activeTrip.session === 'MORNING' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-indigo-100 text-indigo-900 border border-indigo-300'
              }`}>
                <span>{activeTrip.session === 'MORNING' ? '🌅' : '🌆'}</span>
                <span>{activeTrip.sessionName || 'Active Trip'}</span>
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Driver: <strong className="text-slate-700">{user?.name && !user.name.includes('Muthuvel') ? user.name : 'Anand'}</strong> • Bus No: <strong className="text-indigo-600 font-mono">BUS-09</strong>
          </p>
        </div>

        {/* Start / Stop Controls & Session Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {!activeTrip && (
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button
                type="button"
                onClick={() => setSelectedSession('MORNING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  selectedSession === 'MORNING'
                    ? 'bg-white text-amber-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🌅</span>
                <span>Morning</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSession('EVENING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  selectedSession === 'EVENING'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🌆</span>
                <span>Evening</span>
              </button>
            </div>
          )}

          {activeTrip ? (
            <button
              onClick={handleStopTrip}
              disabled={actionLoading}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-sm transition shadow-md shadow-rose-200 flex items-center space-x-2 disabled:opacity-50"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>{actionLoading ? 'Stopping...' : 'Stop Bus Trip'}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsGpsModalOpen(true)}
              disabled={actionLoading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm transition shadow-md shadow-emerald-200 flex items-center space-x-2 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{actionLoading ? 'Starting...' : `Start ${selectedSession === 'MORNING' ? 'Morning' : 'Evening'} Trip`}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {activeTrip && (
        <div className="mb-6 p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-sm">
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping flex-shrink-0" />
            <div>
              <span className="font-extrabold text-emerald-950 flex items-center space-x-1.5">
                <span>Mobile Background GPS Active</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900 uppercase">
                  Continuous Tracking
                </span>
              </span>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Bus coordinates broadcast continuously even if you switch apps, open Google Maps, or lock your phone screen.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-emerald-700 bg-white/80 px-3 py-1 rounded-xl border border-emerald-200/60 self-start sm:self-auto">
            {locationStatus}
          </span>
        </div>
      )}

      {/* Real-time Status Card & Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3.5 mb-8">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Trip Status</span>
              <Clock className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-base sm:text-lg font-bold">
              {activeTrip ? <StatusBadge status="ACTIVE" /> : <span className="text-slate-400">NOT STARTED</span>}
            </p>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {activeTrip ? `Started ${new Date(activeTrip.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Ready to depart'}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-emerald-600 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Present</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-extrabold text-emerald-600 font-mono">
                {stats.presentCount}
              </span>
              <span className="text-xs font-semibold text-slate-400 font-mono ml-1">
                /{stats.totalStudents || 55}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-2">
            {stats.totalStudents ? Math.round((stats.presentCount / stats.totalStudents) * 100) : 0}% boarded
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-blue-600 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1">
                <span>👦</span>
                <span>Boys Present</span>
              </span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-extrabold text-blue-600 font-mono">
                {boysPresent}
              </span>
              <span className="text-xs font-semibold text-slate-400 font-mono ml-1">
                /{totalBoys}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span className="text-rose-500 font-semibold">{boysAbsent} absent</span>
            <span className="text-blue-600 font-bold">{totalBoys > 0 ? Math.round((boysPresent / totalBoys) * 100) : 0}%</span>
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-pink-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-pink-600 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1">
                <span>👧</span>
                <span>Girls Present</span>
              </span>
              <Users className="w-4 h-4 text-pink-600" />
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-extrabold text-pink-600 font-mono">
                {girlsPresent}
              </span>
              <span className="text-xs font-semibold text-slate-400 font-mono ml-1">
                /{totalGirls}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span className="text-rose-500 font-semibold">{girlsAbsent} absent</span>
            <span className="text-pink-600 font-bold">{totalGirls > 0 ? Math.round((girlsPresent / totalGirls) * 100) : 0}%</span>
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-rose-600 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Absent</span>
              <UserX className="w-4 h-4 text-rose-600" />
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-extrabold text-rose-600 font-mono">
                {stats.absentCount}
              </span>
              <span className="text-xs font-semibold text-slate-400 font-mono ml-1">
                /{stats.totalStudents || 55}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Remaining to board</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-indigo-600 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Live Bus GPS</span>
              <Navigation className={`w-4 h-4 text-indigo-600 ${activeTrip ? 'animate-pulse' : ''}`} />
            </div>
            <p className="text-xs font-bold text-slate-800 truncate">
              {locationStatus}
            </p>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-mono truncate">
            {currentCoords
              ? `${currentCoords.latitude.toFixed(4)}, ${currentCoords.longitude.toFixed(4)}${currentCoords.accuracy ? ` (±${Math.round(currentCoords.accuracy)}m)` : ''}`
              : (activeTrip ? 'Tracking active' : 'Standby')}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-indigo-600 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">GPS Range</span>
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-base sm:text-lg font-bold text-slate-900">
              {activeTrip?.geofenceRadius
                ? (activeTrip.geofenceRadius >= 1000 ? `${activeTrip.geofenceRadius / 1000} km` : `${activeTrip.geofenceRadius} m`)
                : (selectedGpsRange >= 1000 ? `${selectedGpsRange / 1000} km` : `${selectedGpsRange} m`)}
            </p>
          </div>
          {activeTrip ? (
            <button
              onClick={() => setIsAdjustRangeModalOpen(true)}
              className="mt-2 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 self-start"
            >
              <Sliders className="w-3 h-3" />
              <span>Change</span>
            </button>
          ) : (
            <p className="text-[11px] text-slate-400 mt-2">Selected boundary</p>
          )}
        </div>
      </div>

      {/* Main Split: Dynamic QR on Left, Live Passenger List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Dynamic QR Display Column */}
        <div className="lg:col-span-6 flex flex-col items-center justify-start">
          {activeTrip ? (
            <div className="w-full">
              {/* GPS Geofence Range Banner */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/90 rounded-2xl p-3.5 mb-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-3">
                  <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm flex-shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900">GPS Validation Range:</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-600 text-white shadow-sm">
                        {activeTrip.geofenceRadius >= 1000 ? `${activeTrip.geofenceRadius / 1000} Kilometer` : `${activeTrip.geofenceRadius} Meter`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Anti-proxy validates scans within <strong>{activeTrip.geofenceRadius >= 1000 ? `${activeTrip.geofenceRadius / 1000} km` : `${activeTrip.geofenceRadius} meters`}</strong> of this bus.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdjustRangeModalOpen(true)}
                  className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5 flex-shrink-0"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Adjust</span>
                </button>
              </div>

              <div className="mb-3 text-center">
                <h2 className="text-lg font-bold text-slate-900">Dynamic Attendance QR</h2>
                <p className="text-xs text-slate-500">
                  Instruct students to scan this QR code using their registered mobile phones.
                </p>
              </div>
              <DynamicQRDisplay activeTrip={activeTrip} />
            </div>
          ) : (
            <div className="w-full bg-white rounded-3xl border-2 border-dashed border-slate-300 p-12 text-center text-slate-500">
              <Bus className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-800">Trip Not Started</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Click the <strong className="text-emerald-600">Start Today's Trip</strong> button at the top to initiate the bus trip and display the secure dynamic attendance QR code.
              </p>
            </div>
          )}
        </div>

        {/* Live Passenger List Column */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Live Passengers ({stats.presentCount}/{stats.totalStudents || 55})
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    👦 Boys: {boysPresent}/{totalBoys}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
                    👧 Girls: {girlsPresent}/{totalGirls}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Students scanned on this active trip</p>
              </div>

              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setGenderFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition text-[11px] ${
                    genderFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({attendees.length})
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter('BOYS')}
                  className={`px-2.5 py-1 rounded-lg transition text-[11px] ${
                    genderFilter === 'BOYS'
                      ? 'bg-blue-600 text-white shadow-sm font-bold'
                      : 'text-blue-700 hover:text-blue-900'
                  }`}
                >
                  👦 Boys ({boysInAttendees})
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter('GIRLS')}
                  className={`px-2.5 py-1 rounded-lg transition text-[11px] ${
                    genderFilter === 'GIRLS'
                      ? 'bg-pink-600 text-white shadow-sm font-bold'
                      : 'text-pink-700 hover:text-pink-900'
                  }`}
                >
                  👧 Girls ({girlsInAttendees})
                </button>
                <button
                  onClick={fetchAttendees}
                  className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg ml-0.5"
                  title="Refresh Attendees"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[480px] divide-y divide-slate-100 p-2">
              {filteredAttendees.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold">
                    {genderFilter === 'ALL'
                      ? 'No students have marked attendance yet.'
                      : `No ${genderFilter === 'BOYS' ? 'boys' : 'girls'} have marked attendance yet.`}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Scanned records appear here instantly.</p>
                </div>
              ) : (
                filteredAttendees.map((rec, idx) => (
                  <div key={rec._id} className="p-3 hover:bg-slate-50 rounded-xl transition flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-mono text-xs font-bold flex items-center justify-center">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-900 text-xs">
                            {rec.studentId?.name || 'Student'}
                          </span>
                          <span className="font-mono text-[11px] text-indigo-600 font-bold">
                            ({rec.studentId?.rollNumber})
                          </span>
                          {rec.studentId?.gender === 'Female' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-pink-50 text-pink-700 border border-pink-200 inline-flex items-center space-x-0.5">
                              <span>👧</span>
                              <span>Girl</span>
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center space-x-0.5">
                              <span>👦</span>
                              <span>Boy</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {rec.studentId?.department} • Dist: {rec.distanceMeters || 0}m
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <StatusBadge status={rec.status} />
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {new Date(rec.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* GPS Range Selection Modal (When starting trip) */}
      {isGpsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 transform transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
                  <Navigation className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Select GPS Geofence Range</h3>
                  <p className="text-xs text-slate-500">Choose permitted attendance validation radius</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGpsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-slate-600 font-medium">
                Students must be physically located within this perimeter from the bus to scan the dynamic QR code:
              </p>

              {GPS_RANGE_OPTIONS.map((opt) => {
                const isSelected = selectedGpsRange === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => setSelectedGpsRange(opt.value)}
                    className={`cursor-pointer rounded-2xl p-4 border-2 transition-all flex items-start space-x-3.5 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="pt-0.5">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                          isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-sm text-slate-900">{opt.label}</span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              opt.value === 100
                                ? 'bg-emerald-100 text-emerald-800'
                                : opt.value === 3000
                                ? 'bg-indigo-100 text-indigo-800'
                                : opt.value === 10000
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-500">
                          {opt.value >= 1000 ? `${opt.value / 1000} km` : `${opt.value} m`}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">{opt.name}</p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{opt.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsGpsModalOpen(false)}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStartTrip(selectedGpsRange)}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-200 flex items-center space-x-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{actionLoading ? 'Starting...' : `Confirm & Start ${selectedSession === 'MORNING' ? 'Morning' : 'Evening'} Trip`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust GPS Range Modal (During active trip) */}
      {isAdjustRangeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 transform transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Adjust Geofence Perimeter</h3>
                  <p className="text-xs text-slate-500">Live adjustment for active trip #{activeTrip?.tripId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustRangeModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-slate-600 font-medium">
                Select the new GPS range boundary for this ongoing trip:
              </p>

              {GPS_RANGE_OPTIONS.map((opt) => {
                const isSelected = selectedGpsRange === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => setSelectedGpsRange(opt.value)}
                    className={`cursor-pointer rounded-2xl p-4 border-2 transition-all flex items-start space-x-3.5 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="pt-0.5">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                          isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-sm text-slate-900">{opt.label}</span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              opt.value === 100
                                ? 'bg-emerald-100 text-emerald-800'
                                : opt.value === 3000
                                ? 'bg-indigo-100 text-indigo-800'
                                : opt.value === 10000
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-500">
                          {opt.value >= 1000 ? `${opt.value / 1000} km` : `${opt.value} m`}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">{opt.name}</p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{opt.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsAdjustRangeModalOpen(false)}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateRange(selectedGpsRange)}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-200 flex items-center space-x-2 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{actionLoading ? 'Updating...' : 'Apply GPS Range'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
