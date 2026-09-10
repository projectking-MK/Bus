import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { getOrCreateDeviceIdentifier, getDeviceInfo } from '../utils/deviceFingerprint';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('smart_bus_auth_token'));
  const [loading, setLoading] = useState(true);

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

            // If student, check if device needs auto-registration
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

  const login = async (email, password) => {
    const res = await axiosClient.post('/api/auth/login', { email, password });
    if (res.data.success) {
      const { token: newToken, user: newUser, student: newStudent } = res.data;
      localStorage.setItem('smart_bus_auth_token', newToken);
      setToken(newToken);
      setUser(newUser);
      setStudent(newStudent);

      if (newUser.role === 'STUDENT') {
        await checkAndRegisterDevice(newStudent);
      }

      return { success: true, user: newUser };
    }
    return { success: false, message: res.data.message || 'Login failed' };
  };

  const logout = () => {
    localStorage.removeItem('smart_bus_auth_token');
    setToken(null);
    setUser(null);
    setStudent(null);
  };

  const refreshProfile = async () => {
    try {
      const res = await axiosClient.get('/api/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
        setStudent(res.data.student);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
