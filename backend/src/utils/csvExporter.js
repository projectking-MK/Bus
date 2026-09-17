/**
 * Converts an array of attendance objects into CSV formatted string.
 *
 * @param {Array<Object>} records Attendance records populated with student and trip info
 * @returns {string} CSV text
 */
export const convertAttendanceToCSV = (records) => {
  const headers = [
    'Roll Number',
    'Student Name',
    'Gender',
    'Department',
    'Year',
    'Status',
    'Date',
    'Marked At',
    'Trip ID',
    'Latitude',
    'Longitude',
    'GPS Accuracy (m)',
    'Distance from Bus (m)',
    'Device Identifier',
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = records.map((rec) => {
    const student = rec.studentId || {};
    const trip = rec.tripId || {};
    const markedAtStr = rec.markedAt ? new Date(rec.markedAt).toISOString() : '';
    const dateStr = rec.date ? new Date(rec.date).toLocaleDateString('en-US') : '';

    return [
      escapeCSV(student.rollNumber || 'N/A'),
      escapeCSV(student.name || 'N/A'),
      escapeCSV(student.gender || 'N/A'),
      escapeCSV(student.department || 'N/A'),
      escapeCSV(student.year || 'N/A'),
      escapeCSV(rec.status || 'N/A'),
      escapeCSV(dateStr),
      escapeCSV(markedAtStr),
      escapeCSV(trip.tripId || 'N/A'),
      escapeCSV(rec.latitude !== undefined ? rec.latitude : ''),
      escapeCSV(rec.longitude !== undefined ? rec.longitude : ''),
      escapeCSV(rec.gpsAccuracy !== undefined ? rec.gpsAccuracy : ''),
      escapeCSV(rec.distanceMeters !== undefined ? rec.distanceMeters : ''),
      escapeCSV(rec.deviceId || ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};
