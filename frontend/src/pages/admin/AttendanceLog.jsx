import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { StatusBadge } from '../../components/StatusBadge';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  FileSpreadsheet,
  MapPin,
  Smartphone,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export const AttendanceLog = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/api/admin/attendance', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          date: dateFilter || undefined,
        },
      });
      if (res.data.success) {
        setRecords(res.data.records);
      }
    } catch (err) {
      console.error('Failed to fetch attendance logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, dateFilter]);

  const csvDownloadUrl = `${import.meta.env.VITE_API_URL || ''}/api/admin/export${
    dateFilter || statusFilter
      ? `?${new URLSearchParams({ date: dateFilter, status: statusFilter }).toString()}`
      : ''
  }`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Attendance Verification Logs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete audit trail with GPS validation, device identifiers, and timestamps.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition shadow-sm flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <a
            href={csvDownloadUrl}
            download
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition shadow-sm flex items-center space-x-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or roll number..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="relative">
          <Calendar className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">PRESENT</option>
            <option value="LATE">LATE</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Attendance Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-6">Roll No</th>
                <th className="py-3.5 px-6">Student Name</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Marked At</th>
                <th className="py-3.5 px-6">GPS Distance</th>
                <th className="py-3.5 px-6">GPS Accuracy</th>
                <th className="py-3.5 px-6">Device Identifier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading attendance records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No attendance records match the selected criteria.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                      {r.studentId?.rollNumber || 'N/A'}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-slate-900">{r.studentId?.name || 'Unknown'}</div>
                      <div className="text-[11px] text-slate-400">{r.studentId?.department || ''}</div>
                    </td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3.5 px-6 whitespace-nowrap text-slate-600">
                      <div>{new Date(r.markedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {new Date(r.markedAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="font-mono font-semibold text-slate-800">
                        {r.distanceMeters !== undefined ? `${r.distanceMeters}m` : '0m'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ({r.latitude.toFixed(4)}, {r.longitude.toFixed(4)})
                      </div>
                    </td>
                    <td className="py-3.5 px-6 font-mono text-slate-600">
                      ±{r.gpsAccuracy}m
                    </td>
                    <td className="py-3.5 px-6 font-mono text-[11px] text-slate-500">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {r.deviceId}
                      </span>
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
