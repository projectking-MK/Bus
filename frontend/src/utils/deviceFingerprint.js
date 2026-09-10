/**
 * Generates and retrieves a persistent client device identifier.
 * Combines browser hardware signals with a persistent local cryptographic UUID.
 */
export const getOrCreateDeviceIdentifier = () => {
  const STORAGE_KEY = 'smart_bus_device_identifier_v1';
  let deviceId = localStorage.getItem(STORAGE_KEY);

  if (!deviceId) {
    // Generate new unique device ID
    const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Hash-like fingerprint seed
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown-tz';
    const platform = navigator.userAgentData?.platform || navigator.platform || 'web';

    deviceId = `DEV-${platform.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}-${randomBytes.slice(0, 12)}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
  }

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
  localStorage.removeItem(STORAGE_KEY);
  return getOrCreateDeviceIdentifier();
};
