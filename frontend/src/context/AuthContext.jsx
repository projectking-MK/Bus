import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { getOrCreateDeviceIdentifier, getDeviceInfo } from '../utils/deviceFingerprint';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('smart_bus_auth_token'));
  const [loading, setLoading] = useState(true);
  const [studentCoords, setStudentCoords] = useState(null);
  const [studentGpsStatus, setStudentGpsStatus] = useState('Standby');
  const [isTripAuthenticated, setIsTripAuthenticated] = useState(true);
  const [currentTrip, setCurrentTrip] = useState(null);

  // Initialize and check current auth session
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('smart_bus_auth_token');
      if (storedToken) {
        try {
          const res = await axiosClient.get('/api/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
            setStudent(res.data.student);
            setIsTripAuthenticated(res.data.isTripAuthenticated ?? true);
            setCurrentTrip(res.data.activeTrip || null);

            // If student, verify device auto-registration
            if (res.data.user.role === 'STUDENT') {
              await checkAndRegisterDevice(res.data.student);
            }
          }
        } catch (err) {
          console.warn('[Auth] Session validation failed:', err.message);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Continuous 1-second live GPS streaming for student - matches driver GPS engine exactly and never locks coordinates
  useEffect(() => {
    let watchId = null;
    let intervalId = null;
    let isBroadcasting = false;

    if (user && user.role === 'STUDENT') {
      setStudentGpsStatus('Live GPS Active (1s)...');

      const sendLocationUpdate = async (lat, lon, accuracy) => {
        if (isBroadcasting) return;
        isBroadcasting = true;
        try {
          await axiosClient.post('/api/students/location', {
            latitude: lat,
            longitude: lon,
            accuracy: accuracy !== undefined && accuracy !== null ? Number(accuracy) : null,
          });
          setStudentCoords({
            latitude: lat,
            longitude: lon,
            accuracy: accuracy || null,
            updatedAt: new Date(),
          });
          setStudentGpsStatus('Live GPS Active (Updated Every 1s)');
        } catch (err) {
          console.warn('[Student GPS Stream Error]', err.response?.data?.message || err.message);
          setStudentGpsStatus('Retrying Live GPS...');
        } finally {
          isBroadcasting = false;
        }
      };

      if (typeof window !== 'undefined' && navigator && navigator.geolocation) {
        // 1. Continuous high-accuracy watchPosition with maximumAge: 0
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            sendLocationUpdate(latitude, longitude, accuracy);
          },
          (err) => {
            console.warn('[Student GPS Watch Warning]', err.message);
            setStudentGpsStatus('GPS Warning (Check permissions)');
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );

        // 2. Active 1-second interval timer ensures sub-second freshness even if watchPosition throttles
        intervalId = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude, accuracy } = pos.coords;
              sendLocationUpdate(latitude, longitude, accuracy);
            },
            (err) => {
              console.warn('[Student GPS Interval Warning]', err.message);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 2500 }
          );
        }, 1000);
      }
    } else {
      setStudentGpsStatus('Inactive');
    }

    return () => {
      if (watchId !== null && typeof window !== 'undefined' && navigator?.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [user]);

  const checkAndRegisterDevice = async (studentDoc) => {
    const currentDeviceId = getOrCreateDeviceIdentifier();
    try {
      const devInfo = getDeviceInfo();
      const res = await axiosClient.post('/api/devices/register', devInfo);
      if (res.data.success && res.data.device) {
        setStudent((prev) => (prev ? { ...prev, deviceRegistrationStatus: true, deviceId: currentDeviceId } : prev));
      }
    } catch (err) {
      console.warn('[Device Check/Binding Notice]', err.response?.data?.message || err.message);
    }
  };

  const login = async (identifier, password) => {
    const res = await axiosClient.post('/api/auth/login', {
      identifier,
      email: identifier,
      username: identifier,
      password,
    });
    if (res.data.success) {
      const { token: newToken, user: newUser, student: newStudent, activeTrip: tripData } = res.data;
      localStorage.setItem('smart_bus_auth_token', newToken);
      setToken(newToken);
      setUser(newUser);
      setStudent(newStudent);
      setCurrentTrip(tripData || null);
      setIsTripAuthenticated(true);

      if (newUser.role === 'STUDENT') {
        await checkAndRegisterDevice(newStudent);
      }

      return { success: true, user: newUser, activeTrip: tripData };
    }
    return { success: false, message: res.data.message || 'Login failed' };
  };

  const logout = () => {
    localStorage.removeItem('smart_bus_auth_token');
    setToken(null);
    setUser(null);
    setStudent(null);
    setStudentCoords(null);
    setStudentGpsStatus('Inactive');
    setIsTripAuthenticated(true);
    setCurrentTrip(null);
  };

  const refreshProfile = async () => {
    try {
      const res = await axiosClient.get('/api/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
        setStudent(res.data.student);
        setIsTripAuthenticated(res.data.isTripAuthenticated ?? true);
        setCurrentTrip(res.data.activeTrip || null);
      }
    } catch (e) {
      console.error('[Refresh Profile Error]', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        student,
        token,
        loading,
        login,
        logout,
        refreshProfile,
        isAuthenticated: !!user,
        deviceIdentifier: getOrCreateDeviceIdentifier(),
        studentCoords,
        studentGpsStatus,
        isTripAuthenticated,
        currentTrip,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
