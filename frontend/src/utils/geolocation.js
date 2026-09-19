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
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      return reject(new Error('Geolocation is not supported by your browser.'));
    }

    // Check last cached GPS in localStorage first as a safe baseline
    let savedGps = null;
    try {
      const raw = localStorage.getItem('smart_bus_last_gps');
      if (raw) savedGps = JSON.parse(raw);
    } catch (_) {}

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 60000, // Accept cached GPS up to 60s while traveling in moving bus
      ...options,
    };

    // First attempt: High accuracy
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const result = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 15),
          timestamp: pos.timestamp || Date.now(),
        };
        try {
          localStorage.setItem('smart_bus_last_gps', JSON.stringify(result));
        } catch (_) {}
        resolve(result);
      },
      (error) => {
        // If high accuracy timed out or failed inside moving bus, try immediate fallback with cellular/wifi assisted GPS
        console.warn('[Geolocation] High accuracy GPS unavailable/timed out on moving bus, attempting network fallback...', error.message);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const result = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy || 35),
              timestamp: pos.timestamp || Date.now(),
            };
            try {
              localStorage.setItem('smart_bus_last_gps', JSON.stringify(result));
            } catch (_) {}
            resolve(result);
          },
          (fallbackErr) => {
            // If even fallback failed, but we have a recently saved GPS coordinate from this trip, use it!
            if (savedGps && savedGps.latitude && (Date.now() - (savedGps.timestamp || 0) < 600000)) {
              console.warn('[Geolocation] Using saved moving bus GPS coordinate as resilient fallback');
              return resolve(savedGps);
            }

            let msg = 'Failed to obtain GPS location.';
            const code = fallbackErr?.code || error?.code;
            let isOff = false;
            switch (code) {
              case 1: // PERMISSION_DENIED
                isOff = true;
                msg = !isSecureOrigin()
                  ? 'Location permission is blocked on HTTP. Please switch to HTTPS.'
                  : 'Location permission was denied. Please allow location access in browser settings.';
                break;
              case 2: // POSITION_UNAVAILABLE
                isOff = true;
                msg = 'Device Location / GPS is turned OFF. Please turn on Location in your phone settings.';
                break;
              case 3: // TIMEOUT
                if (savedGps && savedGps.latitude) {
                  return resolve(savedGps);
                }
                msg = 'GPS request timed out. Please ensure device Location/GPS is turned on.';
                break;
              default:
                msg = fallbackErr?.message || error?.message || msg;
            }
            const errObj = new Error(msg);
            errObj.code = code;
            errObj.isLocationOff = isOff;
            reject(errObj);
          },
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 180000 }
        );
      },
      defaultOptions
    );
  });
};

export const isLocationOffError = (error) => {
  if (!error) return false;
  return (
    error.isLocationOff === true ||
    error.code === 1 ||
    error.code === 2 ||
    /location.*(off|disabled|unavailable|denied|turned off)/i.test(error.message || '')
  );
};
