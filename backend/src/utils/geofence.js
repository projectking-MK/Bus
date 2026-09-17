/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 *
 * @param {number} lat1 Latitude of first point in decimal degrees
 * @param {number} lon1 Longitude of first point in decimal degrees
 * @param {number} lat2 Latitude of second point in decimal degrees
 * @param {number} lon2 Longitude of second point in decimal degrees
 * @returns {number} Distance in meters rounded to 2 decimal places
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    throw new Error('All coordinate parameters (lat1, lon1, lat2, lon2) are required.');
  }

  const R = 6371000; // Radius of the Earth in meters
  const toRad = (angle) => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return Math.round(distance * 100) / 100;
};

/**
 * Validates whether a student GPS reading is inside the permitted bus geofence
 * and meets the accuracy criteria.
 *
 * @param {number} studentLat
 * @param {number} studentLon
 * @param {number} accuracy GPS accuracy radius reported by device in meters
 * @param {number} busLat
 * @param {number} busLon
 * @param {number} allowedRadius Permitted radius in meters (e.g. 100m)
 * @param {number} maxAccuracyThreshold Max acceptable accuracy (default 100m)
 * @returns {{ isInside: boolean, distanceMeters: number, error: string | null }}
 */
export const validateGeofence = (
  studentLat,
  studentLon,
  accuracy,
  busLat,
  busLon,
  allowedRadius = 100,
  maxAccuracyThreshold = 100
) => {
  const effectiveMaxAccuracy = Math.max(
    maxAccuracyThreshold || 100,
    Math.min((allowedRadius || 100) * 0.1, 1000)
  );

  if (accuracy === undefined || accuracy === null || accuracy > effectiveMaxAccuracy) {
    return {
      isInside: false,
      distanceMeters: null,
      error: 'GPS accuracy is too low. Please enable high-accuracy location.',
    };
  }

  const distance = calculateDistance(studentLat, studentLon, busLat, busLon);

  if (distance > allowedRadius) {
    const limitLabel = allowedRadius >= 1000 ? `${allowedRadius / 1000} km` : `${allowedRadius} meters`;
    return {
      isInside: false,
      distanceMeters: distance,
      error: 'You are outside the permitted bus area.',
      detail: `You are outside the permitted bus area (${Math.round(distance)}m away, permitted range is ${limitLabel}).`,
    };
  }

  return {
    isInside: true,
    distanceMeters: distance,
    error: null,
  };
};
