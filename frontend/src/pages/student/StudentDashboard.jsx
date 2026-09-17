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
  AlertCircle
} from 'lucide-react';

export const StudentDashboard = () => {
  const { user, student, deviceIdentifier } = useAuth();
  const [activeTrip, setActiveTrip] = useState(null);
  const [markedForActiveTrip, setMarkedForActiveTrip] = useState(false);
  const [activeTripRecord, setActiveTripRecord] = useState(null);
  const [myAttendance, setMyAttendance] = useState({ history: [], stats: {} });
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);

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

    // Automatically acquire and sync student's current GPS location on dashboard mount
    if (typeof window !== 'undefined' && navigator && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await axiosClient.post('/api/students/location', {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
          } catch (err) {
            console.warn('[Student GPS Auto-update Error]', err.response?.data?.message || err.message);
          }
        },
        (err) => {
          console.warn('[Student GPS Notice]', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);

  const isPresentToday = todayRecord && (todayRecord.status === 'PRESENT' || todayRecord.status === 'LATE');

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
