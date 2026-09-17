import test from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import { calculateDistance, validateGeofence } from '../src/utils/geofence.js';
import { User } from '../src/models/User.js';
import { Student } from '../src/models/Student.js';
import { Device } from '../src/models/Device.js';
import { Bus } from '../src/models/Bus.js';
import { BusTrip } from '../src/models/BusTrip.js';
import { QRCode } from '../src/models/QRCode.js';
import { Attendance } from '../src/models/Attendance.js';
import app from '../src/server.js';

let mongoServer;
let adminToken;
let driverToken;
let student1Token;
let student2Token;
let testBus;
let activeTrip;
let student1;
let student2;
let student3;
let student3Token;

const TEST_SECRET = 'test_jwt_secret_12345';
process.env.JWT_SECRET = TEST_SECRET;
process.env.NODE_ENV = 'test';

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Setup test accounts
  const admin = await User.create({
    name: 'R. Kowshiek IT',
    email: 'admin.test@college.edu',
    password: 'AdminPassword123',
    role: 'ADMIN',
  });
  adminToken = jwt.sign({ id: admin._id, role: 'ADMIN', email: admin.email }, TEST_SECRET);

  const driver = await User.create({
    name: 'Anand',
    email: 'driver.test@college.edu',
    password: 'DriverPassword123',
    role: 'DRIVER',
  });
  driverToken = jwt.sign({ id: driver._id, role: 'DRIVER', email: driver.email }, TEST_SECRET);

  const u1 = await User.create({
    name: 'Aarav Sharma',
    email: 'student01.test@college.edu',
    password: 'StudentPassword123',
    role: 'STUDENT',
  });
  student1 = await Student.create({
    userId: u1._id,
    studentId: 'STD-23CS001',
    rollNumber: '23CS001',
    name: 'Aarav Sharma',
    email: u1.email,
    department: 'Computer Science & Engineering',
    year: '3rd Year',
    gender: 'Male',
    deviceId: 'DEVICE_UUID_PHONE_01',
    deviceRegistrationStatus: true,
  });
  student1Token = jwt.sign({ id: u1._id, role: 'STUDENT', email: u1.email }, TEST_SECRET);

  await Device.create({
    studentId: student1._id,
    deviceIdentifier: 'DEVICE_UUID_PHONE_01',
    status: 'ACTIVE',
  });

  const u2 = await User.create({
    name: 'Aditi Rao',
    email: 'student02.test@college.edu',
    password: 'StudentPassword123',
    role: 'STUDENT',
  });
  student2 = await Student.create({
    userId: u2._id,
    studentId: 'STD-23CS002',
    rollNumber: '23CS002',
    name: 'Aditi Rao',
    email: u2.email,
    department: 'Information Technology',
    year: '3rd Year',
    gender: 'Female',
    deviceId: 'DEVICE_UUID_PHONE_02',
    deviceRegistrationStatus: true,
  });
  student2Token = jwt.sign({ id: u2._id, role: 'STUDENT', email: u2.email }, TEST_SECRET);

  await Device.create({
    studentId: student2._id,
    deviceIdentifier: 'DEVICE_UUID_PHONE_02',
    status: 'ACTIVE',
  });

  const u3 = await User.create({
    name: 'Vikram Singh',
    email: 'student03.test@college.edu',
    password: 'StudentPassword123',
    role: 'STUDENT',
  });
  student3 = await Student.create({
    userId: u3._id,
    studentId: 'STD-23CS003',
    rollNumber: '23CS003',
    name: 'Vikram Singh',
    email: u3.email,
    department: 'Mechanical Engineering',
    year: '2nd Year',
    gender: 'Male',
    deviceId: null,
    deviceRegistrationStatus: false,
  });
  student3Token = jwt.sign({ id: u3._id, role: 'STUDENT', email: u3.email }, TEST_SECRET);

  testBus = await Bus.create({
    busNumber: 'BUS-09',
    routeName: 'College Bus No 09',
    capacity: 55,
    defaultGeofenceRadius: 100,
    defaultCenterLatitude: 13.0827,
    defaultCenterLongitude: 80.2707,
  });
});

test.after(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

// Helper for sending mock Express requests
const makeRequest = async (method, path, body = null, headers = {}) => {
  const url = `http://localhost:${process.env.PORT || 5000}${path}`;
  // We can test controllers through Express app directly using supertest or app.inject/fetch if server is listening
  // Alternatively, use node's native fetch after binding to an ephemeral port!
  const res = await fetch(`http://127.0.0.1:${testPort}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
};

let serverInstance;
let testPort;

test.before(async () => {
  await new Promise((resolve) => {
    serverInstance = app.listen(0, () => {
      testPort = serverInstance.address().port;
      resolve();
    });
  });
});

test.after(async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
});

// TEST SUITE

test('1. Haversine Formula: calculates exact distance between coordinates', () => {
  // Same coordinates => 0 meters
  const distZero = calculateDistance(13.0827, 80.2707, 13.0827, 80.2707);
  assert.equal(distZero, 0);

  // Slight delta: ~55 meters away
  const distClose = calculateDistance(13.0827, 80.2707, 13.0832, 80.2707);
  assert.ok(distClose > 50 && distClose < 60, `Expected ~55m, got ${distClose}`);

  // Outside geofence: ~550 meters away
  const distFar = calculateDistance(13.0827, 80.2707, 13.0877, 80.2707);
  assert.ok(distFar > 500, `Expected > 500m, got ${distFar}`);

  // Geofence helper checks
  const insideCheck = validateGeofence(13.0827, 80.2707, 10, 13.0827, 80.2707, 100);
  assert.equal(insideCheck.isInside, true);
  assert.equal(insideCheck.error, null);

  const outsideCheck = validateGeofence(13.0877, 80.2707, 10, 13.0827, 80.2707, 100);
  assert.equal(outsideCheck.isInside, false);
  assert.equal(outsideCheck.error, 'You are outside the permitted bus area.');
});

test('2. Attendance Security: blocks request when no active trip exists', async () => {
  const res = await makeRequest(
    'POST',
    '/api/attendance/mark',
    {
      qrToken: 'dummy_token',
      deviceIdentifier: 'DEVICE_UUID_PHONE_01',
      latitude: 13.0827,
      longitude: 80.2707,
      gpsAccuracy: 15,
    },
    { Authorization: `Bearer ${student1Token}` }
  );

  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'Attendance is currently closed.');
});

test('3. Bus Trip: Driver starts trip and dynamic QR is generated', async () => {
  const res = await makeRequest(
    'POST',
    '/api/trips/start',
    {
      busId: testBus._id,
      latitude: 13.0827,
      longitude: 80.2707,
      geofenceRadius: 100,
    },
    { Authorization: `Bearer ${driverToken}` }
  );

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.ok(res.body.trip);
  assert.equal(res.body.trip.status, 'ACTIVE');
  assert.ok(res.body.initialQR.token);

  activeTrip = res.body.trip;
});

test('4. Dynamic QR: returns active valid token with countdown (2400s = 40 mins)', async () => {
  const res = await makeRequest('GET', '/api/qr/current', null, {
    Authorization: `Bearer ${driverToken}`,
  });

  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.ok(res.body.remainingSeconds > 0);
  assert.equal(res.body.totalValiditySeconds, 2400);
});

test('5. Valid Attendance: Student 1 scans valid QR inside geofence with registered device', async () => {
  // Get current QR
  const qrRes = await makeRequest('GET', '/api/qr/current', null, {
    Authorization: `Bearer ${driverToken}`,
  });
  const currentToken = qrRes.body.token;

  const res = await makeRequest(
    'POST',
    '/api/attendance/mark',
    {
      qrToken: currentToken,
      deviceIdentifier: 'DEVICE_UUID_PHONE_01',
      latitude: 13.0827, // Same as bus location
      longitude: 80.2707,
      gpsAccuracy: 12,
    },
    { Authorization: `Bearer ${student1Token}` }
  );

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.attendance.status, 'PRESENT');
  assert.equal(res.body.attendance.rollNumber, '23CS001');
});

test('6. Anti-Proxy: blocks duplicate attendance on same trip', async () => {
  const qrRes = await makeRequest('GET', '/api/qr/current', null, {
    Authorization: `Bearer ${driverToken}`,
  });
  const currentToken = qrRes.body.token;

  const res = await makeRequest(
    'POST',
    '/api/attendance/mark',
    {
      qrToken: currentToken,
      deviceIdentifier: 'DEVICE_UUID_PHONE_01',
      latitude: 13.0827,
      longitude: 80.2707,
      gpsAccuracy: 10,
    },
    { Authorization: `Bearer ${student1Token}` }
  );

  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'Attendance already marked for this trip.');
});

test('7. Anti-Proxy: blocks device mismatch (proxy attempt with another device ID)', async () => {
  const qrRes = await makeRequest('GET', '/api/qr/current', null, {
    Authorization: `Bearer ${driverToken}`,
  });
  const currentToken = qrRes.body.token;

  // Student 2 tries using an unregistered phone / student 1's phone ID
  const res = await makeRequest(
    'POST',
    '/api/attendance/mark',
    {
      qrToken: currentToken,
      deviceIdentifier: 'FAKE_OR_WRONG_DEVICE_ID',
      latitude: 13.0827,
      longitude: 80.2707,
      gpsAccuracy: 10,
    },
    { Authorization: `Bearer ${student2Token}` }
  );

  assert.equal(res.status, 403);
  assert.equal(res.body.message, 'This account is registered to another device.');
});

test('8. Anti-Proxy: blocks attendance with expired QR token', async () => {
  // Create an explicitly expired token
  const expiredToken = crypto.randomBytes(16).toString('hex');
  await QRCode.create({
    token: expiredToken,
    tripId: activeTrip._id,
    expiresAt: new Date(Date.now() - 5000), // 5 seconds in the past
    isActive: true,
  });

  const res = await makeRequest(
    'POST',
    '/api/attendance/mark',
    {
      qrToken: expiredToken,
      deviceIdentifier: 'DEVICE_UUID_PHONE_02',
      latitude: 13.0827,
      longitude: 80.2707,
      gpsAccuracy: 10,
    },
    { Authorization: `Bearer ${student2Token}` }
  );

  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'QR code expired. Please scan the current QR.');
});

test('9. Anti-Proxy: blocks attendance when student is outside geofence', async () => {
  const qrRes = await makeRequest('GET', '/api/qr/current', null, {
    Authorization: `Bearer ${driverToken}`,
  });
  const currentToken = qrRes.body.token;

  // Position ~600 meters away
  const res = await makeRequest(
    'POST',
    '/api/attendance/mark',
    {
      qrToken: currentToken,
      deviceIdentifier: 'DEVICE_UUID_PHONE_02',
      latitude: 13.0880,
      longitude: 80.2707,
      gpsAccuracy: 10,
    },
    { Authorization: `Bearer ${student2Token}` }
  );

  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'You are outside the permitted bus area.');
});

test('10. Anti-Proxy: blocks attendance when GPS accuracy is too low (> 100m)', async () => {
  const qrRes = await makeRequest('GET', '/api/qr/current', null, {
    Authorization: `Bearer ${driverToken}`,
  });
  const currentToken = qrRes.body.token;

  const res = await makeRequest(
    'POST',
    '/api/attendance/mark',
    {
      qrToken: currentToken,
      deviceIdentifier: 'DEVICE_UUID_PHONE_02',
      latitude: 13.0827,
      longitude: 80.2707,
      gpsAccuracy: 150, // 150m accuracy is too low!
    },
    { Authorization: `Bearer ${student2Token}` }
  );

  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'GPS accuracy is too low. Please enable high-accuracy location.');
});

test('11. Security: blocks non-student (Driver/Admin) from marking student attendance', async () => {
  const qrRes = await makeRequest('GET', '/api/qr/current', null, {
    Authorization: `Bearer ${driverToken}`,
  });
  const currentToken = qrRes.body.token;

  const res = await makeRequest(
    'POST',
    '/api/attendance/mark',
    {
      qrToken: currentToken,
      deviceIdentifier: 'SOME_DEVICE',
      latitude: 13.0827,
      longitude: 80.2707,
      gpsAccuracy: 10,
    },
    { Authorization: `Bearer ${driverToken}` }
  );

  assert.equal(res.status, 403);
});

test('12. Concurrent Attendance: Multiple students (Student 2) mark attendance with the SAME 20-minute QR token', async () => {
  const qrRes = await makeRequest('GET', '/api/qr/current', null, {
    Authorization: `Bearer ${driverToken}`,
  });
  const currentToken = qrRes.body.token;

  // Student 2 marks attendance using the same QR token as Student 1
  const res = await makeRequest(
    'POST',
    '/api/attendance/mark',
    {
      qrToken: currentToken,
      deviceIdentifier: 'DEVICE_UUID_PHONE_02',
      latitude: 13.0827,
      longitude: 80.2707,
      gpsAccuracy: 12,
    },
    { Authorization: `Bearer ${student2Token}` }
  );

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.attendance.status, 'PRESENT');
  assert.equal(res.body.attendance.rollNumber, '23CS002');
});

test('13. Anti-Proxy: prevents one physical device from being registered by multiple students', async () => {
  const res = await makeRequest(
    'POST',
    '/api/devices/register',
    {
      deviceIdentifier: 'DEVICE_UUID_PHONE_01', // Already registered to Student 1
      userAgent: 'Mozilla/5.0 AntiProxyTest',
    },
    { Authorization: `Bearer ${student3Token}` }
  );

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Anti-Proxy Security: This device is already registered to 23CS001/);
});

test('14. Anti-Proxy: strictly prevents a single physical device from marking attendance for multiple students on the same trip', async () => {
  // Configure student3 with deviceId matching student1's device to test attendance-level trip check
  await Student.updateOne({ _id: student3._id }, { deviceId: 'DEVICE_UUID_PHONE_01', deviceRegistrationStatus: true });

  const qrRes = await makeRequest('GET', '/api/qr/current', null, {
    Authorization: `Bearer ${driverToken}`,
  });
  const currentToken = qrRes.body.token;

  // Student 3 tries to mark attendance on the same active trip using Student 1's device
  const res = await makeRequest(
    'POST',
    '/api/attendance/mark',
    {
      qrToken: currentToken,
      deviceIdentifier: 'DEVICE_UUID_PHONE_01',
      latitude: 13.0827,
      longitude: 80.2707,
      gpsAccuracy: 12,
    },
    { Authorization: `Bearer ${student3Token}` }
  );

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
  assert.match(
    res.body.message,
    /Anti-Proxy Violation: This device has already marked attendance for 23CS001 \(Aarav Sharma\) on this trip/
  );
});

test('15. Admin & Driver: Stop trip closes attendance and recalculates percentages', async () => {
  const stopRes = await makeRequest('POST', '/api/trips/stop', {}, {
    Authorization: `Bearer ${driverToken}`,
  });

  assert.equal(stopRes.status, 200);
  assert.equal(stopRes.body.success, true);
  assert.ok(stopRes.body.summary);
  assert.equal(stopRes.body.summary.presentCount, 2); // Both Student 1 (Boy) and Student 2 (Girl) marked present with same QR
});

test('16. Admin: Export Excel contains Boys/Girls attendance report and absent lists', async () => {
  const res = await fetch(`http://127.0.0.1:${testPort}/api/admin/export-excel`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  assert.equal(res.status, 200);
  assert.equal(
    res.headers.get('content-type'),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  const buffer = await res.arrayBuffer();
  assert.ok(buffer.byteLength > 1000, 'Excel file buffer should be non-empty');
});

test('17. Trip Lifecycle: Morning Trip -> Stop -> Evening Trip starts with 0/default count -> mark fresh attendance -> Admin queries per trip', async () => {
  // 1. Verify attendance is closed right now (since previous trip stopped in test 15)
  const closedRes = await makeRequest(
    'POST',
    '/api/attendance/mark',
    {
      qrToken: 'dummy',
      deviceIdentifier: 'DEVICE_UUID_PHONE_01',
      latitude: 13.0827,
      longitude: 80.2707,
      gpsAccuracy: 12,
    },
    { Authorization: `Bearer ${student1Token}` }
  );
  assert.equal(closedRes.status, 400);
  assert.match(closedRes.body.message, /Attendance is currently closed/);

  // 2. Driver starts an EVENING trip
  const eveningTripRes = await makeRequest(
    'POST',
    '/api/trips/start',
    {
      session: 'EVENING',
      latitude: 13.0827,
      longitude: 80.2707,
      geofenceRadius: 100,
    },
    { Authorization: `Bearer ${driverToken}` }
  );
  assert.equal(eveningTripRes.status, 201);
  assert.equal(eveningTripRes.body.trip.session, 'EVENING');
  assert.equal(eveningTripRes.body.trip.sessionName, 'Evening Trip');
  const eveningTripId = eveningTripRes.body.trip._id;
  const eveningQR = eveningTripRes.body.initialQR.token;

  // 3. Verify Active Trip endpoint returns clean counts (0 present)
  const activeRes = await makeRequest('GET', '/api/trips/active', null, {
    Authorization: `Bearer ${driverToken}`,
  });
  assert.equal(activeRes.body.active, true);
  assert.equal(activeRes.body.stats.presentCount, 0);

  // 4. Student 1 marks attendance on the EVENING trip using their registered device
  const eveningAttendanceRes = await makeRequest(
    'POST',
    '/api/attendance/mark',
    {
      qrToken: eveningQR,
      deviceIdentifier: 'DEVICE_UUID_PHONE_01',
      latitude: 13.0827,
      longitude: 80.2707,
      gpsAccuracy: 10,
    },
    { Authorization: `Bearer ${student1Token}` }
  );
  assert.equal(eveningAttendanceRes.status, 201);
  assert.equal(eveningAttendanceRes.body.success, true);

  // 5. Admin queries dashboard for the EVENING trip specifically
  const eveningDashboardRes = await makeRequest(
    'GET',
    `/api/admin/dashboard?tripId=${eveningTripId}`,
    null,
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.equal(eveningDashboardRes.status, 200);
  assert.equal(eveningDashboardRes.body.stats.presentCount, 1);
  assert.equal(eveningDashboardRes.body.selectedTrip.session, 'EVENING');
  assert.ok(eveningDashboardRes.body.allTrips.length >= 2);

  // 6. Stop the Evening Trip
  const stopEveningRes = await makeRequest('POST', '/api/trips/stop', {}, {
    Authorization: `Bearer ${driverToken}`,
  });
  assert.equal(stopEveningRes.status, 200);
  assert.equal(stopEveningRes.body.summary.presentCount, 1);
});

test('Student can automatically update their current GPS location upon login', async () => {
  const locRes = await makeRequest(
    'POST',
    '/api/students/location',
    {
      latitude: 13.0835,
      longitude: 80.2715,
      accuracy: 12.5,
    },
    { Authorization: `Bearer ${student1Token}` }
  );

  assert.equal(locRes.status, 200);
  assert.equal(locRes.body.success, true);
  assert.equal(locRes.body.location.latitude, 13.0835);
  assert.equal(locRes.body.location.longitude, 80.2715);
  assert.equal(locRes.body.location.accuracy, 12.5);
  assert.ok(locRes.body.location.updatedAt);

  // Check student model in DB
  const student = await Student.findById(student1._id);
  assert.equal(student.lastLatitude, 13.0835);
  assert.equal(student.lastLongitude, 80.2715);
  assert.equal(student.lastGpsAccuracy, 12.5);
  assert.ok(student.lastLocationUpdate);
});

test('Admin can export Boys and Girls credentials in Excel and PDF formats', async () => {
  // 1. Export Boys Excel
  const boysExcelRes = await makeRequest(
    'GET',
    '/api/admin/export-credentials?gender=BOYS&format=xlsx',
    null,
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.equal(boysExcelRes.status, 200);

  // 2. Export Girls Excel
  const girlsExcelRes = await makeRequest(
    'GET',
    '/api/admin/export-credentials?gender=GIRLS&format=xlsx',
    null,
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.equal(girlsExcelRes.status, 200);

  // 3. Export Boys PDF
  const boysPdfRes = await makeRequest(
    'GET',
    '/api/admin/export-credentials?gender=BOYS&format=pdf',
    null,
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.equal(boysPdfRes.status, 200);

  // 4. Export Girls PDF
  const girlsPdfRes = await makeRequest(
    'GET',
    '/api/admin/export-credentials?gender=GIRLS&format=pdf',
    null,
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.equal(girlsPdfRes.status, 200);
});

test('GPS Range Security: validates 100m, 3km, and 100km geofence boundaries', async () => {
  // 1. Validate geofence helper with 100m range
  const range100Inside = validateGeofence(13.0827, 80.2707, 15, 13.0830, 80.2707, 100);
  assert.equal(range100Inside.isInside, true);
  const range100Outside = validateGeofence(13.0827, 80.2707, 15, 13.0850, 80.2707, 100);
  assert.equal(range100Outside.isInside, false);

  // 2. Validate geofence helper with 3000m (3km) range
  const dist1500Check = validateGeofence(13.0827, 80.2707, 25, 13.0960, 80.2707, 3000);
  assert.equal(dist1500Check.isInside, true);
  const dist4500Check = validateGeofence(13.0827, 80.2707, 25, 13.1230, 80.2707, 3000);
  assert.equal(dist4500Check.isInside, false);
  assert.equal(dist4500Check.error, 'You are outside the permitted bus area.');

  // 3. Validate geofence helper with 100000m (100km) range
  const dist50kmCheck = validateGeofence(13.0827, 80.2707, 50, 13.5327, 80.2707, 100000);
  assert.equal(dist50kmCheck.isInside, true);
  const dist120kmCheck = validateGeofence(13.0827, 80.2707, 50, 14.1627, 80.2707, 100000);
  assert.equal(dist120kmCheck.isInside, false);

  // 4. Start trip with 3000m (3km) range selection
  const tripRes = await makeRequest(
    'POST',
    '/api/trips/start',
    {
      busId: testBus._id,
      session: 'SPECIAL',
      latitude: 13.0827,
      longitude: 80.2707,
      geofenceRadius: 3000,
    },
    { Authorization: `Bearer ${driverToken}` }
  );
  assert.equal(tripRes.status, 201);
  assert.equal(tripRes.body.trip.geofenceRadius, 3000);
  const specialQR = tripRes.body.initialQR.token;

  // 5. Student 1 is ~550m away (lat 13.0877): outside 100m, but INSIDE 3000m (3km)!
  const attendResInside3k = await makeRequest(
    'POST',
    '/api/attendance/mark',
    {
      qrToken: specialQR,
      deviceIdentifier: 'DEVICE_UUID_PHONE_01',
      latitude: 13.0877,
      longitude: 80.2707,
      gpsAccuracy: 20,
    },
    { Authorization: `Bearer ${student1Token}` }
  );
  assert.equal(attendResInside3k.status, 201);
  assert.equal(attendResInside3k.body.success, true);

  // 6. Student 2 is ~4500m away (lat 13.1230): OUTSIDE 3000m!
  const attendResOutside3k = await makeRequest(
    'POST',
    '/api/attendance/mark',
    {
      qrToken: specialQR,
      deviceIdentifier: 'DEVICE_UUID_PHONE_02',
      latitude: 13.1230,
      longitude: 80.2707,
      gpsAccuracy: 20,
    },
    { Authorization: `Bearer ${student2Token}` }
  );
  assert.equal(attendResOutside3k.status, 400);
  assert.equal(attendResOutside3k.body.message, 'You are outside the permitted bus area.');

  // 7. Update trip range to 100000m (100km)
  const patchRange100kRes = await makeRequest(
    'PATCH',
    '/api/trips/range',
    { geofenceRadius: 100000 },
    { Authorization: `Bearer ${driverToken}` }
  );
  assert.equal(patchRange100kRes.status, 200);
  assert.equal(patchRange100kRes.body.geofenceRadius, 100000);

  // 8. Now Student 2 at ~4500m away scans again: now accepted because range is 100km!
  const attendResInside100k = await makeRequest(
    'POST',
    '/api/attendance/mark',
    {
      qrToken: specialQR,
      deviceIdentifier: 'DEVICE_UUID_PHONE_02',
      latitude: 13.1230,
      longitude: 80.2707,
      gpsAccuracy: 20,
    },
    { Authorization: `Bearer ${student2Token}` }
  );
  assert.equal(attendResInside100k.status, 201);
  assert.equal(attendResInside100k.body.success, true);

  // 9. Stop the trip
  await makeRequest('POST', '/api/trips/stop', {}, {
    Authorization: `Bearer ${driverToken}`,
  });
});




