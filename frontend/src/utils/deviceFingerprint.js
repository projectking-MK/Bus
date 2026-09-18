/**
 * Generates and retrieves a persistent client device identifier.
 * Uses multi-layer persistence (localStorage + persistent cookie + sessionStorage)
 * and hardware signals to ensure the device identifier is strictly preserved
 * and cannot be bypassed or reset by clearing a single storage layer.
 */
export const getOrCreateDeviceIdentifier = () => {
  const STORAGE_KEY = 'smart_bus_device_identifier_v1';
  let deviceId = null;

  // 1. Try reading from localStorage
  try {
    deviceId = localStorage.getItem(STORAGE_KEY);
  } catch (e) {}

  // 2. Fallback to persistent Cookie if localStorage was cleared
  if (!deviceId && typeof document !== 'undefined') {
    try {
      const match = document.cookie.match(new RegExp('(^|;\\s*)' + STORAGE_KEY + '=([^;]*)'));
      if (match && match[2]) {
        deviceId = decodeURIComponent(match[2]);
        try {
          localStorage.setItem(STORAGE_KEY, deviceId);
        } catch (e) {}
      }
    } catch (e) {}
  }

  // 3. Fallback to sessionStorage
  if (!deviceId && typeof sessionStorage !== 'undefined') {
    try {
      deviceId = sessionStorage.getItem(STORAGE_KEY);
      if (deviceId) {
        try {
          localStorage.setItem(STORAGE_KEY, deviceId);
        } catch (e) {}
      }
    } catch (e) {}
  }

  // 4. If still not found, generate new unique cryptographic hardware device ID
  if (!deviceId) {
    const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const platform = navigator.userAgentData?.platform || navigator.platform || 'web';
    deviceId = `DEV-${platform.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}-${randomBytes.slice(0, 12)}`;
  }

  // 5. Keep all persistence layers strictly synchronized
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, deviceId);
    }
  } catch (e) {}

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, deviceId);
    }
  } catch (e) {}

  try {
    if (typeof document !== 'undefined') {
      document.cookie = `${STORAGE_KEY}=${encodeURIComponent(deviceId)}; max-age=315360000; path=/; SameSite=Lax`;
    }
  } catch (e) {}

  return deviceId;
};

export const getDeviceInfo = () => {
  return {
    deviceIdentifier: getOrCreateDeviceIdentifier(),
    userAgent: navigator.userAgent,
    platform: navigator.platform || 'Unknown',
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
  };
};

/**
 * Diagnostic helper to clear local device token for testing proxy detection
 */
export const resetLocalDeviceIdentifier = () => {
  const STORAGE_KEY = 'smart_bus_device_identifier_v1';
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  try {
    document.cookie = `${STORAGE_KEY}=; max-age=0; path=/; SameSite=Lax`;
  } catch (e) {}
  return getOrCreateDeviceIdentifier();
};
