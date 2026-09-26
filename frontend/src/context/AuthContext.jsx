import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { getOrCreateDeviceIdentifier, getDeviceInfo } from '../utils/deviceFingerprint';
import { forceEnableLocation, saveCachedPosition, getCurrentPosition, getRefinedPosition, isLocationOffError } from '../utils/geolocation';

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

            // If student, verify device auto-registration & automatically obtain current GPS
            if (res.data.user.role === 'STUDENT') {
              await checkAndRegisterDevice(res.data.student);
              obtainAndBroadcastStudentLocation();
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

  // Proactively check browser location permission state
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator?.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' })
        .then((permissionStatus) => {
          if (permissionStatus.state === 'denied') {
            setIsLocationTurnedOff(true);
            setStudentGpsStatus('Location Permission Denied');
          }
          permissionStatus.onchange = () => {
            if (permissionStatus.state === 'denied') {
              setIsLocationTurnedOff(true);
              setStudentGpsStatus('Location Permission Denied');
            } else if (permissionStatus.state === 'granted') {
              setIsLocationTurnedOff(false);
              turnOnLocation().catch(() => {});
            }
          };
        })
        .catch(() => {});
    }
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
          saveCachedPosition({
            latitude: lat,
            longitude: lon,
            accuracy: accuracy || null,
            timestamp: Date.now(),
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
            if (err.code === 1 || err.code === 2 || isLocationOffError(err)) {
              setIsLocationTurnedOff(true);
              setStudentGpsStatus(err.code === 1 ? 'Location Permission Denied' : 'Device Location is OFF');
            } else {
              let saved = null;
              try {
                const raw = localStorage.getItem('smart_bus_last_gps');
                if (raw) saved = JSON.parse(raw);
              } catch (_) {}

              if (saved && saved.latitude) {
                sendLocationUpdate(saved.latitude, saved.longitude, saved.accuracy || 25);
                setStudentGpsStatus('Live GPS Active');
              } else {
                setStudentGpsStatus('GPS Warning (Check permissions)');
              }
            }
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
              if (err.code === 1 || err.code === 2 || isLocationOffError(err)) {
                setIsLocationTurnedOff(true);
                setStudentGpsStatus(err.code === 1 ? 'Location Permission Denied' : 'Device Location is OFF');
              } else {
                let saved = null;
                try {
                  const raw = localStorage.getItem('smart_bus_last_gps');
                  if (raw) saved = JSON.parse(raw);
                } catch (_) {}

                if (saved && saved.latitude) {
                  sendLocationUpdate(saved.latitude, saved.longitude, saved.accuracy || 25);
                  setStudentGpsStatus('Live GPS Active');
                }
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
    // Fast path: if already registered with this exact device, skip network roundtrip
    if (studentDoc && studentDoc.deviceRegistrationStatus && studentDoc.deviceId === currentDeviceId) {
      return;
    }
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

  const obtainAndBroadcastStudentLocation = async (options = {}) => {
    try {
      // 1. Check if we have recent cached GPS in localStorage
      let cachedGps = null;
      try {
        const raw = localStorage.getItem('smart_bus_last_gps');
        if (raw) cachedGps = JSON.parse(raw);
      } catch (_) {}

      // 2. Automatically obtain fresh high-precision position from device GPS
      let pos = null;
      try {
        pos = await getRefinedPosition({
          targetAccuracy: 65,
          acceptableAccuracy: 100,
          maxWaitMs: 3000,
          ...options,
        });
      } catch (err) {
        if (isLocationOffError(err) || err.code === 1 || err.code === 2) {
          setIsLocationTurnedOff(true);
          setStudentGpsStatus(err.code === 1 ? 'Location Permission Denied' : 'Device Location is OFF');
          return null;
        }
        pos = await getCurrentPosition({ timeout: 4000, enableHighAccuracy: true })
          .catch((e) => {
            if (isLocationOffError(e) || e.code === 1 || e.code === 2) {
              setIsLocationTurnedOff(true);
              setStudentGpsStatus(e.code === 1 ? 'Location Permission Denied' : 'Device Location is OFF');
            }
            return null;
          });
      }

      if (!pos && cachedGps && cachedGps.latitude) {
        pos = cachedGps;
      }

      if (pos && pos.latitude && pos.longitude) {
        saveCachedPosition(pos);
        setStudentCoords({
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy || 15,
          updatedAt: new Date(),
        });
        setStudentGpsStatus('Live GPS Active');
        setIsLocationTurnedOff(false);

        // Send immediately to backend location update endpoint
        await axiosClient.post('/api/students/location', {
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy || 15,
        });

        return pos;
      }
    } catch (err) {
      console.warn('[Auto GPS on Login Error]', err.message);
      if (isLocationOffError(err) || err.code === 1 || err.code === 2) {
        setIsLocationTurnedOff(true);
        setStudentGpsStatus(err.code === 1 ? 'Location Permission Denied' : 'Device Location is OFF');
      }
    }
    return null;
  };

  const login = async (identifier, password, coords = null) => {
    let loginCoords = coords;
    if (!loginCoords) {
      try {
        const raw = localStorage.getItem('smart_bus_last_gps');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.latitude && Date.now() - (parsed.timestamp || 0) < 120000) {
            loginCoords = parsed;
          }
        }
      } catch (_) {}
    }

    const payload = {
      identifier,
      email: identifier,
      username: identifier,
      password,
    };

    if (loginCoords && loginCoords.latitude && loginCoords.longitude) {
      payload.latitude = loginCoords.latitude;
      payload.longitude = loginCoords.longitude;
      payload.accuracy = loginCoords.accuracy || null;
    }

    const res = await axiosClient.post('/api/auth/login', payload);
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

      // Fast non-blocking device check so login navigates instantly
      if (newUser.role === 'STUDENT') {
        checkAndRegisterDevice(newStudent);
        // Automatically obtain and broadcast current GPS location every time student logs in
        obtainAndBroadcastStudentLocation();
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

  const turnOnLocation = async () => {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      throw new Error('Geolocation is not supported by your browser.');
    }

    return new Promise((resolve, reject) => {
      // Calling getCurrentPosition with maximumAge: 0 prompts the browser's location permission dialog
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude, accuracy } = position.coords;
            const newPos = {
              latitude,
              longitude,
              accuracy: Math.round(accuracy || 15),
              timestamp: position.timestamp || Date.now(),
            };

            saveCachedPosition(newPos);
            setStudentCoords(newPos);
            setStudentGpsStatus('Live GPS Active');
            setIsLocationTurnedOff(false);

            await axiosClient.post('/api/students/location', {
              latitude: newPos.latitude,
              longitude: newPos.longitude,
              accuracy: newPos.accuracy,
            }).catch(() => {});

            resolve(newPos);
          } catch (err) {
            const fallbackPos = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: Math.round(position.coords.accuracy || 15),
              timestamp: Date.now(),
            };
            setIsLocationTurnedOff(false);
            resolve(fallbackPos);
          }
        },
        (error) => {
          console.warn('[turnOnLocation Error]', error.code, error.message);
          let userMsg = 'Unable to access location services.';
          if (error.code === 1) { // PERMISSION_DENIED
            setIsLocationTurnedOff(true);
            userMsg = 'Location permission was denied. Please allow location access in your browser.';
          } else if (error.code === 2) { // POSITION_UNAVAILABLE
            setIsLocationTurnedOff(true);
            userMsg = 'Device GPS / Location is turned OFF. Please turn on Location in your device settings.';
          } else if (error.code === 3) {
            userMsg = 'Location request timed out. Please try again.';
          }
          const errObj = new Error(userMsg);
          errObj.code = error.code;
          errObj.isLocationOff = error.code === 1 || error.code === 2;
          reject(errObj);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
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
        turnOnLocation,
        obtainAndBroadcastStudentLocation,
        checkAndRegisterDevice,
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
