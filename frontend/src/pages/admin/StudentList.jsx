import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import {
  Users,
  Search,
  Filter,
  Smartphone,
  RotateCcw,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  Percent,
  Key,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
} from 'lucide-react';

export const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [notification, setNotification] = useState(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // Quick Attendance Percentage Edit Modal state
  const [attendanceModalStudent, setAttendanceModalStudent] = useState(null);
  const [newAttendancePct, setNewAttendancePct] = useState(75);
  const [updatingPct, setUpdatingPct] = useState(false);
  const [unbindingAll, setUnbindingAll] = useState(false);

  // Credentials Edit Modal state
  const [credentialsModalStudent, setCredentialsModalStudent] = useState(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCredPassword, setShowCredPassword] = useState(false);
  const [updatingCreds, setUpdatingCreds] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    email: '',
    phone: '',
    gender: 'Male',
    department: 'Computer Science & Engineering',
    year: '3rd Year',
    attendancePercentage: 0,
    username: '',
    password: '',
  });

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/api/students', {
        params: {
          search: search || undefined,
          department: deptFilter || undefined,
        },
      });
      if (res.data.success) {
        let list = res.data.students;
        if (genderFilter) {
          list = list.filter((s) => (s.gender || 'Male').toLowerCase() === genderFilter.toLowerCase());
        }
        setStudents(list);
      }
    } catch (err) {
      setNotification({ type: 'error', text: 'Failed to load students list.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchStudents();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search, deptFilter, genderFilter]);

  const handleResetDevice = async (student) => {
    if (!window.confirm(`Reset device binding for ${student.name} (${student.rollNumber})? This allows them to bind a new mobile phone on next login.`)) {
      return;
    }

    try {
      const res = await axiosClient.post(`/api/devices/reset/${student._id}`);
      if (res.data.success) {
        setNotification({ type: 'success', text: res.data.message });
        fetchStudents();
      }
    } catch (err) {
      setNotification({ type: 'error', text: err.response?.data?.message || 'Failed to reset device binding.' });
    }
  };

  const handleUnbindAll = async () => {
    if (
      !window.confirm(
        'Unbind all devices for all 55 students? Each student will be required to register their phone anew on their next login.'
      )
    ) {
      return;
    }

    try {
      setUnbindingAll(true);
      const res = await axiosClient.post('/api/devices/unbind-all');
      if (res.data.success) {
        setNotification({
          type: 'success',
          text: res.data.message || 'All devices unbound successfully. Students can now bind new devices.',
        });
        fetchStudents();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.response?.data?.message || 'Failed to unbind all devices.',
      });
    } finally {
      setUnbindingAll(false);
    }
  };

  const handleClearAllPercentages = async () => {
    if (
      !window.confirm(
        'Clear attendance percentage for all students to 0%? This will reset all students attendance percentages, attended classes, and total classes to 0.'
      )
    ) {
      return;
    }

    try {
      const res = await axiosClient.post('/api/students/clear-attendance-percentage');
      if (res.data.success) {
        setNotification({
          type: 'success',
          text: res.data.message || 'Successfully cleared attendance percentages for all students to 0%.',
        });
        fetchStudents();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.response?.data?.message || 'Failed to clear attendance percentages.',
      });
    }
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        // Update
        const res = await axiosClient.put(`/api/students/${editingStudent._id}`, formData);
        if (res.data.success) {
          setNotification({ type: 'success', text: 'Student updated successfully.' });
          setIsAddModalOpen(false);
          setEditingStudent(null);
          fetchStudents();
        }
      } else {
        // Create
        const res = await axiosClient.post('/api/students', formData);
        if (res.data.success) {
          setNotification({ type: 'success', text: 'New student added successfully.' });
          setIsAddModalOpen(false);
          fetchStudents();
        }
      }
    } catch (err) {
      setNotification({ type: 'error', text: err.response?.data?.message || 'Operation failed.' });
    }
  };

  const openEdit = (s) => {
    setEditingStudent(s);
    setFormData({
      name: s.name,
      rollNumber: s.rollNumber,
      email: s.email,
      phone: s.phone || '',
      gender: s.gender || 'Male',
      department: s.department,
      year: s.year,
      accountStatus: s.accountStatus,
      attendancePercentage: s.attendancePercentage ?? 0,
      username: s.userId?.username || '',
      password: '',
    });
    setIsAddModalOpen(true);
  };

  const openCredentialsModal = (s) => {
    setCredentialsModalStudent(s);
    setNewUsername(s.userId?.username || '');
    setNewPassword('');
    setShowCredPassword(false);
  };

  const handleGenerateDefaultPassword = () => {
    if (!credentialsModalStudent) return;
    let cleanName = (credentialsModalStudent.name || '').trim();
    if (/^[A-Za-z]\.?\s+/.test(cleanName)) cleanName = cleanName.replace(/^[A-Za-z]\.?\s+/, '');
    cleanName = cleanName.replace(/\s+([A-Za-z]\.?)+$/g, '');
    cleanName = cleanName.replace(/(\s+[A-Za-z]\.?)+$/g, '');
    cleanName = cleanName.replace(/[\s\.]+/g, '').toLowerCase();

    const dept = (credentialsModalStudent.department || '').trim().toUpperCase();
    let deptCode = 'CSE';
    if (dept.includes('INFORMATION') || dept.includes('IT')) deptCode = 'IT';
    else if (dept.includes('ELECTRONIC') || dept.includes('ECE')) deptCode = 'ECE';
    else if (dept.includes('MECHANIC') || dept.includes('MECH')) deptCode = 'MECH';
    else if (dept.includes('COMPUTER') || dept.includes('CSE')) deptCode = 'CSE';
    else if (dept) deptCode = dept.split(' ')[0];

    setNewPassword(`${cleanName}${deptCode}`);
    setShowCredPassword(true);
  };

  const handleUpdateCredentials = async (e) => {
    if (e) e.preventDefault();
    if (!credentialsModalStudent) return;

    if (!newUsername.trim() && !newPassword.trim()) {
      setNotification({ type: 'error', text: 'Please enter a username or password to update.' });
      return;
    }

    try {
      setUpdatingCreds(true);
      const res = await axiosClient.put(
        `/api/students/${credentialsModalStudent._id}/credentials`,
        {
          username: newUsername.trim() || undefined,
          password: newPassword.trim() || undefined,
        }
      );
      if (res.data.success) {
        setNotification({
          type: 'success',
          text: res.data.message || `Credentials updated successfully for ${credentialsModalStudent.name}.`,
        });
        const updatedUsername = res.data.user?.username || newUsername.trim();
        setStudents((prev) =>
          prev.map((s) =>
            s._id === credentialsModalStudent._id
              ? {
                  ...s,
                  userId: {
                    ...(s.userId || {}),
                    username: updatedUsername,
                  },
                }
              : s
          )
        );
        setCredentialsModalStudent(null);
      }
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update student credentials.',
      });
    } finally {
      setUpdatingCreds(false);
    }
  };

  const openAttendanceModal = (s) => {
    setAttendanceModalStudent(s);
    setNewAttendancePct(s.attendancePercentage ?? 0);
  };

  const handleUpdateAttendancePercentage = async (e) => {
    if (e) e.preventDefault();
    if (!attendanceModalStudent) return;
    try {
      setUpdatingPct(true);
      const res = await axiosClient.patch(
        `/api/students/${attendanceModalStudent._id}/attendance-percentage`,
        { attendancePercentage: Number(newAttendancePct) }
      );
      if (res.data.success) {
        setNotification({
          type: 'success',
          text: res.data.message || `Attendance percentage updated to ${newAttendancePct}%.`,
        });
        setStudents((prev) =>
          prev.map((s) =>
            s._id === attendanceModalStudent._id
              ? { ...s, attendancePercentage: res.data.student?.attendancePercentage ?? Number(newAttendancePct) }
              : s
          )
        );
        setAttendanceModalStudent(null);
      }
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update attendance percentage.',
      });
    } finally {
      setUpdatingPct(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImportText(event.target.result || '');
    };
    reader.readAsText(file);
  };

  const handleBulkImportSubmit = async (e) => {
    e.preventDefault();
    if (!importText.trim()) {
      alert('Please paste CSV/JSON student data or choose a file.');
      return;
    }

    setImporting(true);
    try {
      let parsedStudents = [];

      if (importText.trim().startsWith('[') || importText.trim().startsWith('{')) {
        // JSON format
        const json = JSON.parse(importText);
        parsedStudents = Array.isArray(json) ? json : [json];
      } else {
        // CSV format
        const lines = importText.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map((c) => c.trim());
            if (cols.length >= 2) {
              const obj = {};
              headers.forEach((h, idx) => {
                if (h.includes('roll')) obj.rollNumber = cols[idx];
                else if (h.includes('name')) obj.name = cols[idx];
                else if (h.includes('gender')) obj.gender = cols[idx];
                else if (h.includes('email')) obj.email = cols[idx];
                else if (h.includes('phone')) obj.phone = cols[idx];
                else if (h.includes('dept') || h.includes('department')) obj.department = cols[idx];
                else if (h.includes('year')) obj.year = cols[idx];
              });
              if (obj.rollNumber && obj.name) {
                parsedStudents.push(obj);
              }
            }
          }
        }
      }

      if (parsedStudents.length === 0) {
        alert('Could not parse any valid student records. Please ensure CSV headers include Roll Number and Full Name.');
        setImporting(false);
        return;
      }

      const res = await axiosClient.post('/api/students/import', { students: parsedStudents });
      if (res.data.success) {
        setNotification({
          type: 'success',
          text: `Success! ${res.data.message} Total active enrolled students: ${res.data.totalCount}.`,
        });
        setIsImportModalOpen(false);
        setImportText('');
        fetchStudents();
      }
    } catch (err) {
      console.error('[Bulk Import Error]', err);
      alert(err.response?.data?.message || 'Failed to import student records. Please verify formatting.');
    } finally {
      setImporting(false);
    }
  };

  const boysCount = students.filter((s) => (s.gender || 'Male').toLowerCase() === 'male').length;
  const girlsCount = students.filter((s) => (s.gender || 'Male').toLowerCase() === 'female').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Registered Students
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
              55 Capacity
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {boysCount} Boys
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200">
              {girlsCount} Girls
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage student records, review attendance, and feed or update custom 55 student records.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={handleUnbindAll}
            disabled={unbindingAll}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-sm transition shadow-sm flex items-center space-x-2 cursor-pointer"
            title="Unbind all registered student devices"
          >
            <Smartphone className="w-4 h-4 text-amber-600" />
            <span>{unbindingAll ? 'Unbinding...' : 'Unbind'}</span>
          </button>
          <button
            type="button"
            onClick={handleClearAllPercentages}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 font-bold rounded-xl text-sm transition shadow-sm flex items-center space-x-2 cursor-pointer"
            title="Clear attendance percentage for all students to 0%"
          >
            <Percent className="w-4 h-4 text-rose-600" />
            <span>Clear Attendance %</span>
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-sm transition shadow-sm flex items-center space-x-2"
          >
            <UploadCloud className="w-4 h-4 text-indigo-600" />
            <span>Feed / Import 55 Students</span>
          </button>
          <button
            onClick={() => {
              setEditingStudent(null);
              setFormData({
                name: '',
                rollNumber: `23CS${String(students.length + 1).padStart(3, '0')}`,
                email: '',
                phone: '',
                gender: 'Male',
                department: 'Computer Science & Engineering',
                year: '3rd Year',
              });
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition shadow-sm flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`mb-6 p-4 rounded-2xl border text-sm flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, roll number, or email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="w-full md:w-48">
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Genders (Boys & Girls)</option>
            <option value="Male">Boys Only</option>
            <option value="Female">Girls Only</option>
          </select>
        </div>

        <div className="w-full md:w-64">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Departments</option>
            <option value="Computer Science & Engineering">Computer Science & Engineering</option>
            <option value="Information Technology">Information Technology</option>
            <option value="Electronics & Communication">Electronics & Communication</option>
            <option value="Mechanical Engineering">Mechanical Engineering</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-6">Roll No</th>
                <th className="py-3.5 px-6">Student Name</th>
                <th className="py-3.5 px-6">Gender</th>
                <th className="py-3.5 px-6">Academic Year</th>
                <th className="py-3.5 px-6">Department</th>
                <th className="py-3.5 px-6">Device Binding</th>
                <th className="py-3.5 px-6">Attendance %</th>
                <th className="py-3.5 px-6">Account</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-slate-400">
                    No students found matching query.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                      {s.rollNumber}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-slate-900">{s.name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 flex-wrap">
                        <span>{s.email}</span>
                        {s.userId?.username && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                            title={`Username: ${s.userId.username}`}
                          >
                            @{s.userId.username}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          (s.gender || 'Male').toLowerCase() === 'female'
                            ? 'bg-pink-100 text-pink-800 border border-pink-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {(s.gender || 'Male').toLowerCase() === 'female' ? 'Girl' : 'Boy'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-slate-700">
                      {s.year}
                    </td>
                    <td className="py-3.5 px-6 text-slate-600">
                      {s.department}
                    </td>
                    <td className="py-3.5 px-6">
                      {s.deviceRegistrationStatus ? (
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-mono text-[11px]">Bound</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500">
                          Unbound
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6">
                      <button
                        onClick={() => openAttendanceModal(s)}
                        className="group flex items-center space-x-2 text-left hover:bg-slate-100/80 px-2 py-1 rounded-lg transition"
                        title="Click to edit attendance percentage"
                      >
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className={`h-full rounded-full transition-all ${
                              (s.attendancePercentage || 0) >= 75
                                ? 'bg-emerald-600'
                                : (s.attendancePercentage || 0) >= 60
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, s.attendancePercentage || 0)}%` }}
                          ></div>
                        </div>
                        <span className="font-mono font-semibold text-slate-800 group-hover:text-indigo-600">
                          {s.attendancePercentage || 0}%
                        </span>
                        <Percent className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 transition" />
                      </button>
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          s.accountStatus === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {s.accountStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => openCredentialsModal(s)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Change Username & Password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openAttendanceModal(s)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          title="Edit Attendance %"
                        >
                          <Percent className="w-4 h-4" />
                        </button>
                        {s.deviceRegistrationStatus && (
                          <button
                            onClick={() => handleResetDevice(s)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="Reset Device Binding"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Edit Student Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Import 55 Students Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">Feed / Import Student Data</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Feed your own 55 students data using CSV or JSON format. You can download our sample spreadsheet template, fill your student details, and paste or upload it here.
            </p>

            <div className="mb-4">
              <a
                href={`${import.meta.env.VITE_API_URL || ''}/api/students/template`}
                download
                className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-semibold border border-indigo-200 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample 55-Students CSV Template</span>
              </a>
            </div>

            <form onSubmit={handleBulkImportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload CSV File or Paste Data
                </label>
                <input
                  type="file"
                  accept=".csv,.txt,.json"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 mb-2 cursor-pointer"
                />
                <textarea
                  rows={7}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`Roll Number,Full Name,Gender (Male/Female),College Email,Phone Number,Department,Academic Year\n23CS001,Aarav Sharma,Male,student01@college.edu,+91 9876543201,Computer Science & Engineering,3rd Year\n23CS002,Aditi Rao,Female,student02@college.edu,+91 9876543202,Information Technology,3rd Year`}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50 flex items-center space-x-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{importing ? 'Processing...' : 'Import Student Roster'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingStudent ? 'Edit Student Details' : 'Add New Student'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Roll Number</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingStudent}
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Male">Boy (Male)</option>
                    <option value="Female">Girl (Female)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">College Email</label>
                <input
                  type="email"
                  required
                  disabled={!!editingStudent}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Login Username
                  </label>
                  <input
                    type="text"
                    value={formData.username || ''}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="e.g. Kowshiek"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {editingStudent ? 'New Password' : 'Password'}
                  </label>
                  <input
                    type="text"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingStudent ? 'Leave blank to keep' : 'Min 4 characters'}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attendance Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.attendancePercentage ?? 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        attendancePercentage: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="0 - 100"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-sm"
                >
                  {editingStudent ? 'Save Changes' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Attendance Percentage Modal */}
      {attendanceModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Attendance Percentage
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update student's official attendance record
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAttendanceModalStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student Card Summary */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    {attendanceModalStudent.name}
                  </div>
                  <div className="text-xs font-mono text-slate-500 mt-0.5">
                    {attendanceModalStudent.rollNumber} • {attendanceModalStudent.department}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    (attendanceModalStudent.gender || 'Male').toLowerCase() === 'female'
                      ? 'bg-pink-100 text-pink-800 border border-pink-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  {(attendanceModalStudent.gender || 'Male').toLowerCase() === 'female' ? 'Girl' : 'Boy'}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-500">Current Attendance:</span>
                <span className="font-mono font-bold text-slate-800">
                  {attendanceModalStudent.attendancePercentage ?? 0}%
                </span>
              </div>
            </div>

            <form onSubmit={handleUpdateAttendancePercentage} className="space-y-4">
              {/* Slider & Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700">
                    New Percentage Value
                  </label>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newAttendancePct}
                      onChange={(e) =>
                        setNewAttendancePct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                      }
                      className="w-16 px-2 py-1 text-center border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-xs font-bold text-slate-500">%</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={newAttendancePct}
                  onChange={(e) => setNewAttendancePct(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />

                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>75% (Eligible)</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Quick Presets
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[60, 75, 85, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewAttendancePct(preset)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition border ${
                        newAttendancePct === preset
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Alert */}
              <div
                className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                  newAttendancePct >= 75
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : newAttendancePct >= 60
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {newAttendancePct >= 75 ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                )}
                <span>
                  {newAttendancePct >= 75
                    ? 'Eligible: Meets or exceeds the 75% minimum threshold.'
                    : 'Attendance Shortage: Below the 75% requirement for exam hall ticket.'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setAttendanceModalStudent(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingPct}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {updatingPct ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Save Percentage</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Credentials (Username & Password) Modal */}
      {credentialsModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Change Student Credentials
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update student login username and password
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCredentialsModalStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student Info Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    {credentialsModalStudent.name}
                  </div>
                  <div className="text-xs font-mono text-slate-500 mt-0.5">
                    {credentialsModalStudent.rollNumber} • {credentialsModalStudent.department}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    (credentialsModalStudent.gender || 'Male').toLowerCase() === 'female'
                      ? 'bg-pink-100 text-pink-800 border border-pink-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  {(credentialsModalStudent.gender || 'Male').toLowerCase() === 'female' ? 'Girl' : 'Boy'}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-500">Current Login Username:</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {credentialsModalStudent.userId?.username || credentialsModalStudent.name}
                </span>
              </div>
            </div>

            <form onSubmit={handleUpdateCredentials} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Login Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. Kowshiek"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Student can use this username or their Roll Number to log in.
                </p>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    New Password
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateDefaultPassword}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
                    title="Generate default pattern: <CleanName><Dept>"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-generate Default</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showCredPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 4 chars)"
                    className="w-full pl-3.5 pr-10 py-2 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCredPassword(!showCredPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  >
                    {showCredPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave blank if you only want to change the username.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setCredentialsModalStudent(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingCreds}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                >
                  {updatingCreds ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Update Credentials</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
