import axios from 'axios';
import { getOrCreateDeviceIdentifier } from '../utils/deviceFingerprint';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smart_bus_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const deviceId = getOrCreateDeviceIdentifier();
    if (deviceId) {
      config.headers['x-device-id'] = deviceId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('smart_bus_auth_token');
        localStorage.removeItem('smart_bus_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
