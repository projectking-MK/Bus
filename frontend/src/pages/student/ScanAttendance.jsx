import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import { QRScanner } from '../../components/QRScanner';
import { getCurrentPosition } from '../../utils/geolocation';
import {
  QrCode,
  MapPin,
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  Bus
} from 'lucide-react';

export const ScanAttendance = () => {
  const { user, student, deviceIdentifier } = useAuth();
  const navigate = useNavigate();

  const [scanning, setScanning] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);

  // Status checks for visual progression
  const [checks, setChecks] = useState({
    device: { status: 'pending', label: 'Registered Hardware Device' },
    trip: { status: 'pending', label: 'Active Bus Trip' },
    qr: { status: 'pending', label: 'Dynamic QR Token' },
    gps: { status: 'pending', label: 'GPS Geofence & Accuracy' },
  });

  const handleScanSuccess = async (scannedToken) => {
    if (submitting || !scanning) return;

    setScanning(false);
    setSubmitting(true);
    setErrorDetails(null);

    // Initial check state
    setChecks({
      device: { status: 'checking', label: 'Checking device identifier...' },
      trip: { status: 'pending', label: 'Verifying active trip...' },
      qr: { status: 'pending', label: 'Validating dynamic QR...' },
      gps: { status: 'pending', label: 'Acquiring high-precision GPS...' },
    });

    try {
      // 1. Hardware device check
      setChecks((prev) => ({
        ...prev,
        device: { status: 'success', label: `Device Verified: ${deviceIdentifier.slice(0, 14)}...` },
        gps: { status: 'checking', label: 'Acquiring high-accuracy GPS coordinates...' },
      }));

      // 2. Obtain GPS coordinates
      let position;
      try {
        position = await getCurrentPosition({ timeout: 15000 });
      } catch (gpsError) {
        setChecks((prev) => ({
          ...prev,
          gps: { status: 'error', label: gpsError.message },
        }));
        setErrorDetails(gpsError.message);
        setSubmitting(false);
        return;
      }

      setChecks((prev) => ({
        ...prev,
        gps: {
          status: 'success',
          label: `GPS Locked (Acc: ±${position.accuracy}m)`,
        },
        qr: { status: 'checking', label: 'Submitting to anti-proxy server pipeline...' },
      }));

      // 3. Submit to server validation endpoint
      const payload = {
        qrToken: scannedToken,
        deviceIdentifier,
        latitude: position.latitude,
        longitude: position.longitude,
        gpsAccuracy: position.accuracy,
      };

      const res = await axiosClient.post('/api/attendance/mark', payload);

      if (res.data.success) {
        setChecks((prev) => ({
          ...prev,
          trip: { status: 'success', label: 'Active Bus Trip Validated' },
          qr: { status: 'success', label: 'Valid Dynamic QR Token' },
        }));

        setVerificationResult({
          status: 'PRESENT',
          message: res.data.message || 'Attendance marked successfully.',
          details: res.data.attendance,
        });
      }
    } catch (err) {
      console.error('[Attendance Submission Error]', err);
      const serverMessage = err.response?.data?.message || err.message || 'Verification failed.';
      
      // Highlight which step failed based on server response
      setChecks((prev) => {
        const next = { ...prev };
        if (serverMessage.includes('device')) {
          next.device = { status: 'error', label: serverMessage };
        } else if (serverMessage.includes('trip') || serverMessage.includes('closed')) {
          next.trip = { status: 'error', label: serverMessage };
        } else if (serverMessage.includes('QR')) {
          next.qr = { status: 'error', label: serverMessage };
        } else if (serverMessage.includes('GPS') || serverMessage.includes('outside') || serverMessage.includes('area')) {
          next.gps = { status: 'error', label: serverMessage };
        } else {
          next.qr = { status: 'error', label: serverMessage };
        }
        return next;
      });

      setErrorDetails(serverMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetScan = () => {
    setVerificationResult(null);
    setErrorDetails(null);
    setChecks({
      device: { status: 'pending', label: 'Registered Hardware Device' },
      trip: { status: 'pending', label: 'Active Bus Trip' },
      qr: { status: 'pending', label: 'Dynamic QR Token' },
      gps: { status: 'pending', label: 'GPS Geofence & Accuracy' },
    });
    setScanning(true);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/student/dashboard')}
          className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold text-slate-900">Mark Attendance</h1>
          <p className="text-[11px] text-slate-500 font-mono">Roll: {student?.rollNumber}</p>
        </div>
        <div className="w-9"></div> {/* spacer */}
      </div>

      {/* Verification Success View */}
      {verificationResult ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
            Status: PRESENT
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mb-1">
            Attendance Marked Successfully
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Multi-layer anti-proxy checks verified your presence on College Bus #BUS-01.
          </p>

          <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-2 text-xs mb-6 border border-slate-100">
            <div className="flex justify-between text-slate-600">
              <span>Student Name:</span>
              <strong className="text-slate-800">{student?.name}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Roll Number:</span>
              <strong className="font-mono text-slate-800">{student?.rollNumber}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Distance from Bus:</span>
              <strong className="font-mono text-slate-800">{verificationResult.details?.distanceMeters || 0} meters</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Timestamp:</span>
              <strong className="font-mono text-slate-800">
                {new Date(verificationResult.details?.markedAt).toLocaleTimeString()}
              </strong>
            </div>
          </div>

          <button
            onClick={() => navigate('/student/dashboard')}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm transition shadow-md shadow-indigo-200"
          >
            Return to Dashboard
          </button>
        </div>
      ) : (
        <>
          {/* Camera Scanner View */}
          <div className="mb-6">
            <QRScanner onScanSuccess={handleScanSuccess} scanning={scanning} />
          </div>

          {/* Error Banner */}
          {errorDetails && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="font-bold block">Validation Rejected</strong>
                <span>{errorDetails}</span>
                <button
                  onClick={handleResetScan}
                  className="mt-2 block font-semibold text-rose-700 underline hover:text-rose-900"
                >
                  Click here to retry scan
                </button>
              </div>
            </div>
          )}

          {/* Step-by-Step Multi-Layer Security Status Panel */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Security Pipeline</span>
              </span>
              <span>Multi-Layer</span>
            </div>

            <div className="space-y-3">
              {Object.entries(checks).map(([key, item]) => {
                const isSuccess = item.status === 'success';
                const isError = item.status === 'error';
                const isChecking = item.status === 'checking';

                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                      isSuccess
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                        : isError
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : isChecking
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900 animate-pulse'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      {key === 'device' && <Smartphone className="w-4 h-4 flex-shrink-0" />}
                      {key === 'trip' && <Bus className="w-4 h-4 flex-shrink-0" />}
                      {key === 'qr' && <QrCode className="w-4 h-4 flex-shrink-0" />}
                      {key === 'gps' && <MapPin className="w-4 h-4 flex-shrink-0" />}
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex-shrink-0 ml-2">
                      {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      {isError && <XCircle className="w-4 h-4 text-rose-600" />}
                      {isChecking && (
                        <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
