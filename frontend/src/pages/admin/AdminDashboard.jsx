import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Percent,
  Bus,
  MapPin,
  FileSpreadsheet,
  RefreshCw,
  Smartphone,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/api/admin/dashboard');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      setError('Failed to fetch dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 15000); // Poll every 15s for live counts
    return () => clearInterval(interval);
  }, []);

  const stats = data?.stats || {};
  const activeTrip = data?.activeTrip;
  const recentActivity = data?.recentActivity || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Admin Attendance Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            College Bus #BUS-01 • Real-time Monitoring & Verification
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition shadow-sm flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <a
            href={`${import.meta.env.VITE_API_URL || ''}/api/admin/export`}
            download
            className="px-3.5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-sm font-medium transition shadow-sm flex items-center space-x-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Students</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 font-mono">
            {stats.totalStudents || 68}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {stats.registeredDevices || 0} Devices Bound
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Present Today</span>
            <UserCheck className="w-4 h-4" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 font-mono">
            {stats.presentToday || 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">Verified on bus</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Absent Today</span>
            <UserX className="w-4 h-4" />
          </div>
          <p className="text-3xl font-extrabold text-rose-600 font-mono">
            {stats.absentToday !== undefined ? stats.absentToday : 68}
          </p>
          <p className="text-xs text-slate-500 mt-1">Not yet marked</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Late Today</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-3xl font-extrabold text-amber-600 font-mono">
            {stats.lateToday || 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">Marked past time</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Attendance</span>
            <Percent className="w-4 h-4" />
          </div>
          <p className="text-3xl font-extrabold text-indigo-600 font-mono">
            {stats.averageAttendancePercentage || 0}%
          </p>
          <p className="text-xs text-slate-500 mt-1">Batch aggregate</p>
        </div>
      </div>

      {/* Active Trip Banner */}
      <div className="mb-8">
        {activeTrip ? (
          <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                    Active Trip in Progress
                  </span>
                </div>
                <h3 className="text-xl font-bold">
                  {activeTrip.busNumber} • {activeTrip.routeName}
                </h3>
                <p className="text-xs text-indigo-200 mt-1">
                  Driver: {activeTrip.driverName || 'Designated Driver'} • Trip ID: <span className="font-mono">{activeTrip.tripId}</span>
                </p>
              </div>

              <div className="flex items-center space-x-6 bg-white/10 backdrop-blur px-5 py-3 rounded-2xl border border-white/15">
                <div className="text-center">
                  <span className="text-xs text-indigo-200 uppercase font-semibold">Present</span>
                  <p className="text-2xl font-black font-mono text-emerald-400">{activeTrip.presentCount}</p>
                </div>
                <div className="h-8 w-px bg-white/20"></div>
                <div className="text-center">
                  <span className="text-xs text-indigo-200 uppercase font-semibold">Remaining</span>
                  <p className="text-2xl font-black font-mono text-amber-300">{activeTrip.absentCount}</p>
                </div>
                <div className="h-8 w-px bg-white/20"></div>
                <div className="text-center">
                  <span className="text-xs text-indigo-200 uppercase font-semibold">Geofence</span>
                  <p className="text-sm font-bold font-mono text-white">{activeTrip.geofenceRadius}m radius</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
            <Bus className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No active bus trip right now</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Attendance opens automatically once the driver starts today's trip.
            </p>
          </div>
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          to="/admin/students"
          className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:border-indigo-300 hover:shadow-md transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Manage 68 Students</h3>
          <p className="text-xs text-slate-500">
            View student roster, roll numbers, reset hardware device binding, and edit records.
          </p>
        </Link>

        <Link
          to="/admin/attendance"
          className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:border-indigo-300 hover:shadow-md transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Audit & Attendance Logs</h3>
          <p className="text-xs text-slate-500">
            Inspect GPS coordinates, accuracy meters, device identifiers, and validation status.
          </p>
        </Link>

        <Link
          to="/admin/trips"
          className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:border-indigo-300 hover:shadow-md transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:bg-amber-600 group-hover:text-white transition">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Route & Geofence Config</h3>
          <p className="text-xs text-slate-500">
            Adjust permitted bus radius (meters), campus coordinates, and view trip history.
          </p>
        </Link>
      </div>

      {/* Recent Attendance Activity Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Attendance Activity</h3>
            <p className="text-xs text-slate-500">Live feed of students marking attendance</p>
          </div>
          <Link
            to="/admin/attendance"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            View All Logs →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-6">Roll Number</th>
                <th className="py-3 px-6">Student Name</th>
                <th className="py-3 px-6">Department</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6">Distance from Bus</th>
                <th className="py-3 px-6">Device ID</th>
                <th className="py-3 px-6">Marked At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No attendance records recorded yet today.
                  </td>
                </tr>
              ) : (
                recentActivity.map((rec) => (
                  <tr key={rec._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-800">
                      {rec.studentId?.rollNumber || 'N/A'}
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      {rec.studentId?.name || 'Unknown Student'}
                    </td>
                    <td className="py-3.5 px-6 text-slate-600">
                      {rec.studentId?.department || 'N/A'}
                    </td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={rec.status} />
                    </td>
                    <td className="py-3.5 px-6 font-mono text-slate-700">
                      {rec.distanceMeters !== undefined ? `${rec.distanceMeters}m` : '0m'}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-[11px] text-slate-500 truncate max-w-[140px]">
                      {rec.deviceId}
                    </td>
                    <td className="py-3.5 px-6 text-slate-500 whitespace-nowrap">
                      {new Date(rec.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
