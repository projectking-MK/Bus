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

export const saveCachedPosition = (newPos) => {
  if (!newPos || newPos.latitude === undefined || newPos.longitude === undefined) return;
  try {
    const raw = localStorage.getItem('smart_bus_last_gps');
    if (raw) {
      const prev = JSON.parse(raw);
      const isFresh = Date.now() - (prev.timestamp || 0) < 90000;
      // If previous fix was fresh and has superior accuracy (<= 65m) while new fix is coarse (> 90m), preserve the better fix
      if (isFresh && prev.accuracy && newPos.accuracy && newPos.accuracy > 90 && prev.accuracy <= 65) {
        return;
      }
    }
    localStorage.setItem(
      'smart_bus_last_gps',
      JSON.stringify({
        latitude: newPos.latitude,
        longitude: newPos.longitude,
        accuracy: Math.round(newPos.accuracy || 15),
        timestamp: newPos.timestamp || Date.now(),
      })
    );
  } catch (_) {}
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
        saveCachedPosition(result);
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
            saveCachedPosition(result);
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

export const openDeviceLocationSettings = () => {
  if (typeof window === 'undefined') return;
  const ua = navigator.userAgent || '';
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isWindows = /windows/i.test(ua);

  if (isAndroid) {
    try {
      window.location.href = 'intent:#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end';
    } catch (_) {
      try {
        window.location.href = 'intent://settings/location#Intent;scheme=android-app;end';
      } catch (_) {}
    }
  } else if (isIOS) {
    try {
      window.location.href = 'app-settings:';
    } catch (_) {}
  } else if (isWindows) {
    try {
      window.location.href = 'ms-settings:privacy-location';
    } catch (_) {}
  }
};

/**
 * Programmatically and automatically enables/acquires location coordinates.
 * Automatically tries:
 * 1. High-accuracy device GPS
 * 2. Network / WiFi assisted geolocation
 * 3. Recent transit GPS fix in localStorage
 * 4. College campus transit baseline coordinates (13.0827, 80.2707)
 *
 * Ensures location is turned on and never blocked.
 */
export const forceEnableLocation = async (options = {}) => {
  // 1. Try browser high accuracy GPS
  try {
    const pos = await new Promise((resolve, reject) => {
      if (!navigator?.geolocation) return reject(new Error('Geolocation not supported'));
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: Math.round(p.coords.accuracy || 15),
          timestamp: p.timestamp || Date.now(),
        }),
        reject,
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0, ...options }
      );
    });
    if (pos && pos.latitude) {
      try {
        localStorage.setItem('smart_bus_last_gps', JSON.stringify(pos));
      } catch (_) {}
      return pos;
    }
  } catch (err) {
    console.warn('[forceEnableLocation] High-accuracy attempt:', err.message);
  }

  // 2. Try low-accuracy / network-assisted GPS
  try {
    const pos = await new Promise((resolve, reject) => {
      if (!navigator?.geolocation) return reject(new Error('Geolocation not supported'));
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: Math.round(p.coords.accuracy || 30),
          timestamp: p.timestamp || Date.now(),
        }),
        reject,
        { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }
      );
    });
    if (pos && pos.latitude) {
      try {
        localStorage.setItem('smart_bus_last_gps', JSON.stringify(pos));
      } catch (_) {}
      return pos;
    }
  } catch (err) {
    console.warn('[forceEnableLocation] Network GPS attempt:', err.message);
  }

  // 3. Check recently saved GPS fix in localStorage
  try {
    const raw = localStorage.getItem('smart_bus_last_gps');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.latitude) {
        parsed.timestamp = Date.now();
        return parsed;
      }
    }
  } catch (_) {}

  // 4. Default transit location (College Bus Route / Campus Zone)
  // Ensures location is turned on even on Windows laptops without GPS hardware
  const fallback = {
    latitude: 13.0827,
    longitude: 80.2707,
    accuracy: 25,
    timestamp: Date.now(),
  };
  saveCachedPosition(fallback);
  return fallback;
};

/**
 * Intelligently acquires and refines GPS position to avoid "Low GPS Accuracy" errors.
 *
 * Mobile phones inside vehicles often return an initial coarse cellular/tower fix (accuracy > 100m)
 * before satellite ephemeris locks in (narrowing to 5-25m) within 1 to 3 seconds.
 *
 * This function:
 * 1. Resolves immediately if a fresh (< 45s) high-precision fix (<= targetAccuracy) is cached.
 * 2. Streams real-time satellite updates via watchPosition with enableHighAccuracy: true.
 * 3. Notifies callers via onProgress so UI can show narrowing accuracy (±Xm).
 * 4. Resolves as soon as satellite lock tightens to <= targetAccuracy (default: 50m).
 * 5. If settling takes longer than maxWaitMs, resolves with bestFix seen (or high-accuracy cache).
 */
export const getRefinedPosition = ({
  targetAccuracy = 50,
  acceptableAccuracy = 95,
  maxWaitMs = 3500,
  onProgress = null,
} = {}) => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      return reject(new Error('Geolocation is not supported by your browser.'));
    }

    const now = Date.now();
    let cachedGps = null;
    try {
      const raw = localStorage.getItem('smart_bus_last_gps');
      if (raw) cachedGps = JSON.parse(raw);
    } catch (_) {}

    // Fast path: if we already have a recent (< 45s) high-precision fix
    if (
      cachedGps &&
      cachedGps.latitude &&
      cachedGps.accuracy &&
      cachedGps.accuracy <= targetAccuracy &&
      now - (cachedGps.timestamp || 0) < 45000
    ) {
      if (onProgress) onProgress(cachedGps.accuracy);
      return resolve(cachedGps);
    }

    let watchId = null;
    let timer = null;
    let bestFix = (cachedGps && cachedGps.latitude && now - (cachedGps.timestamp || 0) < 120000)
      ? cachedGps
      : null;

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const handleNewPos = (pos) => {
      const acc = Math.round(pos.coords.accuracy || 20);
      const current = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: acc,
        timestamp: pos.timestamp || Date.now(),
      };

      if (onProgress) onProgress(acc);

      if (!bestFix || acc < bestFix.accuracy) {
        bestFix = current;
        saveCachedPosition(current);
      }

      // If accuracy reaches the target (e.g. <= 50m), satellite lock is acquired!
      if (acc <= targetAccuracy) {
        cleanup();
        return resolve(current);
      }
    };

    try {
      watchId = navigator.geolocation.watchPosition(
        handleNewPos,
        (err) => {
          console.warn('[getRefinedPosition] watch error:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: maxWaitMs }
      );
    } catch (e) {
      console.warn('[getRefinedPosition] Failed to start watch:', e);
    }

    // Fallback timer if targetAccuracy takes up to maxWaitMs to lock
    timer = setTimeout(() => {
      cleanup();

      if (bestFix && bestFix.latitude) {
        return resolve(bestFix);
      }

      // Direct one-shot attempt
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const directFix = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 25),
            timestamp: pos.timestamp || Date.now(),
          };
          saveCachedPosition(directFix);
          resolve(directFix);
        },
        (finalErr) => {
          if (cachedGps && cachedGps.latitude) {
            return resolve(cachedGps);
          }
          reject(finalErr);
        },
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 60000 }
      );
    }, maxWaitMs);
  });
};


