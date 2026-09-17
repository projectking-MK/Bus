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
  AlertCircle,
  Key,
  ChevronDown,
  Download,
  Trash2,
  X
} from 'lucide-react';

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [activeTab, setActiveTab] = useState('present'); // 'present' | 'absent'

  // Delete trip attendance state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState(null);
  const [deletingTrip, setDeletingTrip] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState(null);

  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingCreds, setExportingCreds] = useState(false);

  const fetchDashboard = async (tripIdOverride) => {
    try {
      setLoading(true);
      const targetId = tripIdOverride !== undefined ? tripIdOverride : selectedTripId;
      const url = targetId ? `/api/admin/dashboard?tripId=${targetId}` : '/api/admin/dashboard';
      const res = await axiosClient.get(url);
      if (res.data.success) {
        setData(res.data);
        if (!selectedTripId && res.data.selectedTrip) {
          setSelectedTripId(res.data.selectedTrip.id);
        }
      }
    } catch (err) {
      setError('Failed to fetch dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      const url = `/api/admin/export-excel${selectedTrip ? `?tripId=${selectedTrip.id}` : ''}`;
      const response = await axiosClient.get(url, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Extract filename from Content-Disposition header if available
      let filename = `Bus_Attendance_Report_${selectedTrip?.session || 'Trip'}.xlsx`;
      const disposition = response.headers['content-disposition'];
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to export Excel:', err);
      alert('Failed to export Excel report. Please ensure your session is active.');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExportingCSV(true);
      const url = `/api/admin/export${selectedTrip ? `?tripId=${selectedTrip.id}` : ''}`;
      const response = await axiosClient.get(url, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `Bus_Attendance_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to export CSV. Please ensure your session is active.');
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportCredentials = async (gender = 'ALL', format = 'xlsx') => {
    try {
      setExportingCreds(true);
      const url = `/api/admin/export-credentials?gender=${gender}&format=${format}`;
      const mimeType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const response = await axiosClient.get(url, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: mimeType });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      let filename = `${gender === 'GIRLS' ? 'Girls' : gender === 'BOYS' ? 'Boys' : 'All_Students'}_Credentials.${format}`;
      const disposition = response.headers['content-disposition'];
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to export credentials:', err);
      alert('Failed to export student credentials. Please ensure your session is active.');
    } finally {
      setExportingCreds(false);
    }
  };

  const openDeleteModal = (trip) => {
    setTripToDelete(trip);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteTrip = async () => {
    if (!tripToDelete) return;
    try {
      setDeletingTrip(true);
      const res = await axiosClient.delete(`/api/trips/${tripToDelete.id || tripToDelete._id}`);
      if (res.data.success) {
        setIsDeleteModalOpen(false);
        setTripToDelete(null);
        setSelectedTripId(''); // Reset so it defaults to latest remaining trip
        setDeleteSuccessMsg(
          res.data.message ||
            `Trip attendance deleted successfully. Database space has been freed (${res.data.freedSpace?.attendanceRecords || 0} records purged).`
        );
        setTimeout(() => setDeleteSuccessMsg(null), 6000);
        await fetchDashboard('');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete trip attendance.');
    } finally {
      setDeletingTrip(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(() => {
      fetchDashboard();
    }, 15000); // Poll every 15s for live counts
    return () => clearInterval(interval);
  }, [selectedTripId]);

  const stats = data?.stats || {};
  const selectedTrip = data?.selectedTrip;
  const allTrips = data?.allTrips || [];
  const activeTrip = data?.activeTrip;
  const recentActivity = data?.recentActivity || [];
  const absentStudents = data?.absentStudents || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Admin Attendance Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            College Bus #BUS-09 • Real-time Monitoring & Separate Trip Records
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchDashboard()}
            disabled={loading}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition shadow-sm flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Student Credentials Export Dropdown */}
          <div className="relative group">
            <button
              type="button"
              disabled={exportingCreds}
              className="px-3.5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-sm font-bold transition shadow-sm flex items-center space-x-2 disabled:opacity-60 cursor-pointer"
            >
              <Key className="w-4 h-4" />
              <span>{exportingCreds ? 'Downloading...' : 'Student Credentials'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 hidden group-hover:block transition-all">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Excel Spreadsheets (.xlsx)
              </div>
              <button
                type="button"
                onClick={() => handleExportCredentials('BOYS', 'xlsx')}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between"
              >
                <span>👦 Boys Credentials (21)</span>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportCredentials('GIRLS', 'xlsx')}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-pink-50 hover:text-pink-700 flex items-center justify-between"
              >
                <span>👧 Girls Credentials (34)</span>
                <span className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded font-mono">Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportCredentials('ALL', 'xlsx')}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-between border-b border-slate-100 pb-2"
              >
                <span>👥 Master (Both Sheets)</span>
                <span className="text-[10px] bg-slate-150 text-slate-700 px-1.5 py-0.5 rounded font-mono">Excel</span>
              </button>

              <div className="px-3 pt-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                PDF Documents (.pdf)
              </div>
              <button
                type="button"
                onClick={() => handleExportCredentials('BOYS', 'pdf')}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between"
              >
                <span>👦 Boys Credentials (21)</span>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">PDF</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportCredentials('GIRLS', 'pdf')}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 flex items-center justify-between"
              >
                <span>👧 Girls Credentials (34)</span>
                <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-mono">PDF</span>
              </button>
            </div>
          </div>

          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-sm font-bold transition shadow-sm flex items-center space-x-2 disabled:opacity-60 cursor-pointer"
          >
            <FileSpreadsheet className={`w-4 h-4 ${exportingExcel ? 'animate-spin' : ''}`} />
            <span>{exportingExcel ? 'Generating Excel...' : 'Export Excel (.xlsx)'}</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={exportingCSV}
            className="px-3.5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-medium transition flex items-center space-x-2 disabled:opacity-60 cursor-pointer"
          >
            <span>{exportingCSV ? 'Exporting...' : 'CSV'}</span>
          </button>
        </div>
      </div>

      {/* Trip Selector & Session Status Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl ${selectedTrip?.session === 'MORNING' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}`}>
            <Bus className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Selected Session:</span>
              {selectedTrip && (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase ${
                  selectedTrip.status === 'ACTIVE' 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse' 
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {selectedTrip.status === 'ACTIVE' ? '🟢 ACTIVE IN PROGRESS' : '⚪ COMPLETED'}
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              {selectedTrip 
                ? `${selectedTrip.session === 'MORNING' ? '🌅' : '🌆'} ${selectedTrip.sessionName} (${selectedTrip.busNumber})` 
                : 'No Trip Selected'}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-600 flex-shrink-0">View Records For:</label>
            <select
              value={selectedTrip?.id || selectedTripId}
              onChange={(e) => {
                setSelectedTripId(e.target.value);
                fetchDashboard(e.target.value);
              }}
              className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            >
              {allTrips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.session === 'MORNING' ? '🌅 Morning' : '🌆 Evening'} Trip • {new Date(t.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })} ({new Date(t.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) [{t.status}]
                </option>
              ))}
            </select>
          </div>

          {selectedTrip && (
            <button
              onClick={() => openDeleteModal(selectedTrip)}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-1.5 cursor-pointer"
              title="Delete attendance for this trip and free up database space"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Delete Trip Attendance</span>
            </button>
          )}
        </div>
      </div>

      {deleteSuccessMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span className="font-medium">{deleteSuccessMsg}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Students</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 font-mono">
            {stats.totalStudents || 55}
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
            {stats.absentToday !== undefined ? stats.absentToday : 55}
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

      {/* Gender-wise Breakdown Row (Requested feature) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50/60 p-4 rounded-2xl border border-indigo-100">
          <div className="flex items-center justify-between text-indigo-900 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Boys Present</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-200/60 font-semibold text-indigo-800">
              of {stats.totalBoys || 21} Boys
            </span>
          </div>
          <p className="text-2xl font-extrabold text-indigo-700 font-mono">
            {stats.boysPresent || 0}
          </p>
          <p className="text-[11px] text-indigo-600 mt-0.5">Verified boys on bus</p>
        </div>

        <div className="bg-gradient-to-br from-pink-50 to-rose-50/60 p-4 rounded-2xl border border-pink-100">
          <div className="flex items-center justify-between text-pink-900 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Girls Present</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-pink-200/60 font-semibold text-pink-800">
              of {stats.totalGirls || 34} Girls
            </span>
          </div>
          <p className="text-2xl font-extrabold text-pink-700 font-mono">
            {stats.girlsPresent || 0}
          </p>
          <p className="text-[11px] text-pink-600 mt-0.5">Verified girls on bus</p>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-red-50/60 p-4 rounded-2xl border border-rose-100">
          <div className="flex items-center justify-between text-rose-900 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Boys Absent</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-200/60 font-semibold text-rose-800">
              Roster in Excel
            </span>
          </div>
          <p className="text-2xl font-extrabold text-rose-700 font-mono">
            {stats.boysAbsent !== undefined ? stats.boysAbsent : 21}
          </p>
          <p className="text-[11px] text-rose-600 mt-0.5">Absent boys with Name & Year</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 p-4 rounded-2xl border border-amber-100">
          <div className="flex items-center justify-between text-amber-900 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Girls Absent</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-200/60 font-semibold text-amber-800">
              Roster in Excel
            </span>
          </div>
          <p className="text-2xl font-extrabold text-amber-700 font-mono">
            {stats.girlsAbsent !== undefined ? stats.girlsAbsent : 34}
          </p>
          <p className="text-[11px] text-amber-600 mt-0.5">Absent girls with Name & Year</p>
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
                  Driver: {activeTrip.driverName && !activeTrip.driverName.includes('Muthuvel') ? activeTrip.driverName : 'Anand'} • Trip ID: <span className="font-mono">{activeTrip.tripId}</span>
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
          <h3 className="text-base font-bold text-slate-900 mb-1">Manage 55 Students</h3>
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

      {/* Attendance & Absentee Rosters for Selected Trip */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tab Switcher */}
          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('present')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                activeTab === 'present'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Boarded Students ({stats.presentCount || 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('absent')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                activeTab === 'absent'
                  ? 'bg-white text-rose-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserX className="w-4 h-4 text-rose-600" />
              <span>Absent Students ({stats.absentCount || 0})</span>
            </button>
          </div>

          <Link
            to="/admin/attendance"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Detailed Security Logs →
          </Link>
        </div>

        {activeTab === 'present' ? (
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
                      No attendance records for this trip session yet.
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-50/60 text-rose-700 uppercase tracking-wider font-semibold border-b border-rose-100">
                <tr>
                  <th className="py-3 px-6">Roll Number</th>
                  <th className="py-3 px-6">Student Name</th>
                  <th className="py-3 px-6">Year</th>
                  <th className="py-3 px-6">Department</th>
                  <th className="py-3 px-6">Gender</th>
                  <th className="py-3 px-6">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {absentStudents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-emerald-600 font-semibold">
                      🎉 All 55 students were present on this trip! Zero absentees.
                    </td>
                  </tr>
                ) : (
                  absentStudents.map((st) => (
                    <tr key={st.id || st.rollNumber} className="hover:bg-rose-50/30 transition">
                      <td className="py-3.5 px-6 font-mono font-bold text-slate-800">
                        {st.rollNumber}
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-900">
                        {st.name}
                      </td>
                      <td className="py-3.5 px-6 font-medium text-slate-600">
                        {st.year || 'N/A'}
                      </td>
                      <td className="py-3.5 px-6 text-slate-600">
                        {st.department || 'N/A'}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          st.gender?.toLowerCase() === 'male' ? 'bg-indigo-50 text-indigo-700' : 'bg-pink-50 text-pink-700'
                        }`}>
                          {st.gender}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          ABSENT
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Trip & Free Space Confirmation Modal */}
      {isDeleteModalOpen && tripToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Delete Trip Attendance
                  </h3>
                  <p className="text-xs text-slate-500">
                    Free up MongoDB database storage space
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Trip Info Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Trip Identifier:</span>
                <span className="font-mono font-bold text-slate-800">{tripToDelete.tripId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Session Name:</span>
                <span className="font-semibold text-slate-800">{tripToDelete.sessionName || tripToDelete.session}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  tripToDelete.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {tripToDelete.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Start Time:</span>
                <span className="font-medium text-slate-600">
                  {tripToDelete.startTime ? new Date(tripToDelete.startTime).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/80 rounded-2xl border border-rose-200 text-xs text-rose-800 mb-6 space-y-1.5">
              <div className="font-bold flex items-center space-x-1.5 text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>Database Cleanup & Free Space:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-rose-700 pl-1">
                <li>Permanently purges all attendance check-ins for this trip.</li>
                <li>Deletes all associated dynamic QR tokens.</li>
                <li>Permanently removes the trip record to reclaim database storage.</li>
                <li>Recalculates students' attendance counts & percentages so records stay accurate.</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingTrip}
                onClick={confirmDeleteTrip}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
              >
                {deletingTrip ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Freeing Space...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Trip & Free Space</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
