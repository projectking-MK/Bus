/**
 * Obtains high-accuracy GPS coordinates from the browser's Geolocation API.
 * Provides user-friendly error messages and accuracy metrics.
 *
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number, timestamp: number}>}
 */
export const isSecureOrigin = () => {
  if (typeof window === 'undefined') return true;
  return (
    window.isSecureContext ||
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
};

export const getCurrentPosition = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('Geolocation is not supported by your browser.'));
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
      ...options,
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: pos.timestamp,
        });
      },
      (error) => {
        let msg = 'Failed to obtain GPS location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            if (!isSecureOrigin()) {
              msg = 'Location permission is blocked on HTTP. Please switch to HTTPS or allow it in browser settings.';
            } else {
              msg = 'Location permission was denied. Please allow location access in your browser settings to mark attendance.';
            }
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Location information is currently unavailable. Please ensure your device GPS is turned on.';
            break;
          case error.TIMEOUT:
            msg = 'GPS location request timed out. Please retry with a clearer sky view or WiFi enabled.';
            break;
          default:
            msg = error.message || msg;
        }
        reject(new Error(msg));
      },
      defaultOptions
    );
  });
};
