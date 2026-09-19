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
  const [isLocationTurnedOff, setIsLocationTurnedOff] = useState(false);

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

            // Maintain persistent driver session
            if (res.data.user.role === 'DRIVER') {
              localStorage.setItem('smart_bus_driver_session', 'true');
              localStorage.setItem('smart_bus_user_role', 'DRIVER');
            } else {
              localStorage.removeItem('smart_bus_driver_session');
              localStorage.setItem('smart_bus_user_role', res.data.user.role);
            }

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
          setStudentGpsStatus('Live GPS Active');
          setIsLocationTurnedOff(false);
        } catch (err) {
          console.warn('[Student GPS Stream Error]', err.response?.data?.message || err.message);
          setStudentGpsStatus('Retrying Live GPS...');
        } finally {
          isBroadcasting = false;
        }
      };

      if (typeof window !== 'undefined' && navigator && navigator.geolocation) {
        // Continuous watchPosition with reasonable maximumAge so mobile devices stream smoothly
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            sendLocationUpdate(latitude, longitude, accuracy);
            setIsLocationTurnedOff(false);
          },
          (err) => {
            console.warn('[Student GPS Watch Warning]', err.message);
            if (err.code === 1 || err.code === 2) {
              setIsLocationTurnedOff(true);
            }
            setStudentGpsStatus('GPS Warning (Check permissions)');
          },
          { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 }
        );

        // Fallback interval every 10s
        intervalId = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude, accuracy } = pos.coords;
              sendLocationUpdate(latitude, longitude, accuracy);
              setIsLocationTurnedOff(false);
            },
            (err) => {
              if (err.code === 1 || err.code === 2) {
                setIsLocationTurnedOff(true);
              }
              console.warn('[Student GPS Interval Warning]', err.message);
            },
            { enableHighAccuracy: true, maximumAge: 20000, timeout: 8000 }
          );
        }, 10000);
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

      // Persistent driver session
      if (newUser.role === 'DRIVER') {
        localStorage.setItem('smart_bus_driver_session', 'true');
        localStorage.setItem('smart_bus_user_role', 'DRIVER');
      } else {
        localStorage.removeItem('smart_bus_driver_session');
        localStorage.setItem('smart_bus_user_role', newUser.role);
      }

      if (newUser.role === 'STUDENT') {
        await checkAndRegisterDevice(newStudent);
      }

      return { success: true, user: newUser, activeTrip: tripData };
    }
    return { success: false, message: res.data.message || 'Login failed' };
  };

  const logout = () => {
    localStorage.removeItem('smart_bus_auth_token');
    localStorage.removeItem('smart_bus_driver_session');
    localStorage.removeItem('smart_bus_user_role');
    setToken(null);
    setUser(null);
    setStudent(null);
    setStudentCoords(null);
    setStudentGpsStatus('Inactive');
    setIsTripAuthenticated(true);
    setCurrentTrip(null);
    setIsLocationTurnedOff(false);
  };

  const refreshProfile = async () => {
    try {
      const res = await axiosClient.get('/api/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
        setStudent(res.data.student);
        setIsTripAuthenticated(res.data.isTripAuthenticated ?? true);
        setCurrentTrip(res.data.activeTrip || null);
        if (res.data.user.role === 'DRIVER') {
          localStorage.setItem('smart_bus_driver_session', 'true');
          localStorage.setItem('smart_bus_user_role', 'DRIVER');
        }
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
        isLocationTurnedOff,
        setIsLocationTurnedOff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
