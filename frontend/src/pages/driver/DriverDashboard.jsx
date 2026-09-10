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
  Navigation
} from 'lucide-react';

export const DriverDashboard = () => {
  const { user } = useAuth();
  const [activeTrip, setActiveTrip] = useState(null);
  const [stats, setStats] = useState({ totalStudents: 68, presentCount: 0, absentCount: 68 });
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Standby');
  const [currentCoords, setCurrentCoords] = useState(null);
  const [error, setError] = useState(null);

  const locationWatchRef = useRef(null);

  const fetchActiveTrip = async () => {
    try {
      setError(null);
      const res = await axiosClient.get('/api/trips/active');
      if (res.data.success) {
        if (res.data.active && res.data.trip) {
          setActiveTrip(res.data.trip);
          setStats(res.data.stats || { totalStudents: 68, presentCount: 0, absentCount: 68 });
          // Also fetch attendees
          fetchAttendees();
        } else {
          setActiveTrip(null);
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
        setAttendees(res.data.records);
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

  // GPS location streaming for active trip
  useEffect(() => {
    let watchId = null;

    if (activeTrip) {
      setLocationStatus('Streaming Driver GPS...');

      const sendLocationUpdate = async (lat, lon) => {
        try {
          await axiosClient.post('/api/trips/location', { latitude: lat, longitude: lon });
          setCurrentCoords({ latitude: lat, longitude: lon, updatedAt: new Date() });
          setLocationStatus('GPS Locked & Broadcasting');
        } catch (e) {
          setLocationStatus('GPS Update Error');
        }
      };

      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            sendLocationUpdate(latitude, longitude);
          },
          (err) => {
            console.warn('[Driver GPS Warning]', err.message);
            setLocationStatus('GPS Warning (Check permissions)');
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
      }
    } else {
      setLocationStatus('Inactive');
    }

    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [activeTrip?.tripId]);

  const handleStartTrip = async () => {
    setActionLoading(true);
    setError(null);
    try {
      let initialLat = 13.0827;
      let initialLon = 80.2707;

      try {
        const pos = await getCurrentPosition();
        initialLat = pos.latitude;
        initialLon = pos.longitude;
      } catch (gpsErr) {
        console.warn('Could not acquire driver initial GPS, using default campus center:', gpsErr.message);
      }

      const res = await axiosClient.post('/api/trips/start', {
        latitude: initialLat,
        longitude: initialLon,
        geofenceRadius: 100,
      });

      if (res.data.success) {
        setActiveTrip(res.data.trip);
        fetchActiveTrip();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start trip.');
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
        alert(`Trip Completed!\n\nPresent: ${res.data.summary.presentCount}\nAbsent: ${res.data.summary.absentCount}`);
        fetchActiveTrip();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to stop trip.');
    } finally {
      setActionLoading(false);
    }
  };

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
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Driver: <strong className="text-slate-700">{user?.name}</strong> • Bus No: <strong className="text-indigo-600 font-mono">BUS-01</strong>
          </p>
        </div>

        {/* Start / Stop Controls */}
        <div className="flex items-center space-x-3">
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
              onClick={handleStartTrip}
              disabled={actionLoading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm transition shadow-md shadow-emerald-200 flex items-center space-x-2 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{actionLoading ? 'Starting...' : 'Start Today\'s Trip'}</span>
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

      {/* Real-time Status Card & Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Trip Status</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-lg font-bold">
            {activeTrip ? <StatusBadge status="ACTIVE" /> : <span className="text-slate-400">NOT STARTED</span>}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {activeTrip ? `Started ${new Date(activeTrip.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Ready to depart'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Present Count</span>
            <UserCheck className="w-4 h-4" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 font-mono">
            {stats.presentCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Boarded & verified</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Absent Count</span>
            <UserX className="w-4 h-4" />
          </div>
          <p className="text-3xl font-extrabold text-rose-600 font-mono">
            {stats.absentCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Remaining to board</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-indigo-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Bus Location</span>
            <Navigation className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xs font-semibold text-slate-800 truncate">
            {locationStatus}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-mono">
            {currentCoords
              ? `${currentCoords.latitude.toFixed(4)}, ${currentCoords.longitude.toFixed(4)}`
              : 'GPS streaming active'}
          </p>
        </div>
      </div>

      {/* Main Split: Dynamic QR on Left, Live Passenger List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Dynamic QR Display Column */}
        <div className="lg:col-span-6 flex flex-col items-center justify-start">
          {activeTrip ? (
            <div className="w-full">
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
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Live Passengers ({stats.presentCount}/68)</h3>
                <p className="text-xs text-slate-500">Students scanned on this active trip</p>
              </div>
              <button
                onClick={fetchAttendees}
                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
                title="Refresh Attendees"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[480px] divide-y divide-slate-100 p-2">
              {attendees.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold">No students have marked attendance yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Scanned records appear here instantly.</p>
                </div>
              ) : (
                attendees.map((rec, idx) => (
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
    </div>
  );
};
