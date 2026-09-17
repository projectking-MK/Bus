import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { StatusBadge } from '../../components/StatusBadge';
import {
  MapPin,
  Save,
  Bus,
  CheckCircle,
  AlertCircle,
  History,
  Compass,
  Trash2,
  X
} from 'lucide-react';

export const TripConfig = () => {
  const [bus, setBus] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Delete trip state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState(null);
  const [deletingTrip, setDeletingTrip] = useState(false);

  const [formData, setFormData] = useState({
    radius: 100,
    centerLatitude: 13.0827,
    centerLongitude: 80.2707,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [busRes, tripsRes] = await Promise.all([
        axiosClient.get('/api/admin/settings'),
        axiosClient.get('/api/trips'),
      ]);

      if (busRes.data.success && busRes.data.bus) {
        setBus(busRes.data.bus);
        setFormData({
          radius: busRes.data.bus.defaultGeofenceRadius || 100,
          centerLatitude: busRes.data.bus.defaultCenterLatitude || 13.0827,
          centerLongitude: busRes.data.bus.defaultCenterLongitude || 80.2707,
        });
      }

      if (tripsRes.data.success) {
        setTrips(tripsRes.data.trips);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axiosClient.put('/api/admin/settings', formData);
      if (res.data.success) {
        setNotification({ type: 'success', text: 'Bus geofence and campus parameters saved!' });
        setBus(res.data.bus);
      }
    } catch (err) {
      setNotification({ type: 'error', text: 'Failed to update geofence parameters.' });
    } finally {
      setSaving(false);
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
      const res = await axiosClient.delete(`/api/trips/${tripToDelete._id || tripToDelete.id}`);
      if (res.data.success) {
        setNotification({
          type: 'success',
          text: res.data.message || 'Trip and attendance deleted. Database space freed!',
        });
        setIsDeleteModalOpen(false);
        setTripToDelete(null);
        await fetchData();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.response?.data?.message || 'Failed to delete trip and free space.',
      });
    } finally {
      setDeletingTrip(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Route & Geofence Configuration
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Define permitted radius (meters) and reference coordinates for anti-proxy validation.
        </p>
      </div>

      {notification && (
        <div
          className={`mb-6 p-4 rounded-2xl border text-sm flex items-center space-x-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Settings Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center space-x-2 mb-4 text-indigo-600">
            <Compass className="w-5 h-5" />
            <h2 className="text-base font-bold text-slate-900">Geofence Parameters</h2>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Allowed Radius (Meters)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="20"
                  max="1000"
                  required
                  value={formData.radius}
                  onChange={(e) => setFormData({ ...formData, radius: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">meters</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Recommended: 100m. Students outside this radius will be rejected.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Campus Reference Latitude
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={formData.centerLatitude}
                onChange={(e) => setFormData({ ...formData, centerLatitude: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Campus Reference Longitude
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={formData.centerLongitude}
                onChange={(e) => setFormData({ ...formData, centerLongitude: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-sm flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Geofence Rules'}</span>
            </button>
          </form>
        </div>

        {/* Bus Overview Card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center space-x-2 mb-4 text-indigo-600">
            <Bus className="w-5 h-5" />
            <h2 className="text-base font-bold text-slate-900">Vehicle Assignment</h2>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div>
              <span className="text-xs text-slate-500">Bus Identifier</span>
              <p className="text-base font-bold text-slate-900 font-mono">{bus?.busNumber || 'BUS-09'}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Total Capacity</span>
              <p className="text-base font-bold text-slate-900 font-mono">{bus?.capacity || 55} Students</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Current Radius</span>
              <p className="text-base font-bold text-indigo-600 font-mono">{bus?.defaultGeofenceRadius || 100}m</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Status</span>
              <p className="text-base font-bold text-emerald-600">Operational</p>
            </div>
          </div>

          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center space-x-1.5">
            <History className="w-4 h-4 text-slate-500" />
            <span>Past Trips History</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4">Trip ID</th>
                  <th className="py-2.5 px-4">Driver</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Start Time</th>
                  <th className="py-2.5 px-4">End Time</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-400">
                      No trip history recorded yet.
                    </td>
                  </tr>
                ) : (
                  trips.slice(0, 15).map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{t.tripId}</td>
                      <td className="py-3 px-4 text-slate-700">{t.driverId?.name || 'Assigned Driver'}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {t.startTime ? new Date(t.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {t.endTime ? new Date(t.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In Progress'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openDeleteModal(t)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete trip and free database space"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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
                    Delete Trip & Free Space
                  </h3>
                  <p className="text-xs text-slate-500">
                    Purge attendance data from MongoDB
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

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Trip Identifier:</span>
                <span className="font-mono font-bold text-slate-800">{tripToDelete.tripId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Session:</span>
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
            </div>

            <div className="p-3.5 bg-rose-50/80 rounded-2xl border border-rose-200 text-xs text-rose-800 mb-6 space-y-1.5">
              <div className="font-bold flex items-center space-x-1.5 text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>Database Cleanup:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-rose-700 pl-1">
                <li>Permanently purges all attendance records for this trip.</li>
                <li>Deletes all associated dynamic QR tokens.</li>
                <li>Frees up storage space in MongoDB collections.</li>
                <li>Recalculates student attendance statistics.</li>
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
