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

test('4. Dynamic QR: returns active valid token with countdown (3000s = 50 mins)', async () => {
  const res = await makeRequest('GET', '/api/qr/current', null, {
    Authorization: `Bearer ${driverToken}`,
  });

  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.ok(res.body.remainingSeconds > 0);
  assert.equal(res.body.totalValiditySeconds, 3000);
});

test('4b. Student Per-Trip Login: Rejects attendance if student did not log in for the active trip', async () => {
  const qrRes = await makeRequest('GET', '/api/qr/current', null, {
    Authorization: `Bearer ${driverToken}`,
  });
  const currentToken = qrRes.body.token;

  // Attempt attendance with pre-trip student1Token
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
    { Authorization: `Bearer ${student1Token}` }
  );

  assert.equal(res.status, 401);
  assert.equal(res.body.requireTripLogin, true);
  assert.match(res.body.message, /Please log in to authenticate for/);
});

test('4c. Student Per-Trip Login: Students log in for active trip and obtain trip-authenticated session', async () => {
  const login1 = await makeRequest('POST', '/api/auth/login', {
    identifier: student1.rollNumber,
    password: 'StudentPassword123',
  });
  assert.equal(login1.status, 200);
  assert.equal(login1.body.success, true);
  assert.ok(login1.body.user.authenticatedTripId);
  student1Token = login1.body.token;

  const login2 = await makeRequest('POST', '/api/auth/login', {
    identifier: student2.rollNumber,
    password: 'StudentPassword123',
  });
  assert.equal(login2.status, 200);
  assert.equal(login2.body.success, true);
  assert.ok(login2.body.user.authenticatedTripId);
  student2Token = login2.body.token;
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

  // Student 3 logs in for active trip
  const log3 = await makeRequest('POST', '/api/auth/login', {
    identifier: student3.rollNumber,
    password: 'StudentPassword123',
  });
  student3Token = log3.body.token;

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

  // 3b. Student 1 logs in fresh for the Evening Trip (per-trip authentication)
  const eveningLogin = await makeRequest('POST', '/api/auth/login', {
    identifier: student1.rollNumber,
    password: 'StudentPassword123',
  });
  assert.equal(eveningLogin.status, 200);
  assert.equal(eveningLogin.body.success, true);
  student1Token = eveningLogin.body.token;

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

  // Log in students for this trip
  const log1 = await makeRequest('POST', '/api/auth/login', {
    identifier: student1.rollNumber,
    password: 'StudentPassword123',
  });
  student1Token = log1.body.token;

  const log2 = await makeRequest('POST', '/api/auth/login', {
    identifier: student2.rollNumber,
    password: 'StudentPassword123',
  });
  student2Token = log2.body.token;

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

test('Attendance Verification Logs: accurately populates student gender (Male and Female) and supports gender filtering', async () => {
  const logsRes = await makeRequest(
    'GET',
    '/api/admin/attendance',
    null,
    { Authorization: `Bearer ${adminToken}` }
  );

  assert.equal(logsRes.status, 200);
  assert.ok(logsRes.body.records.length > 0);

  // Find Student 1 (Male) record
  const student1Log = logsRes.body.records.find((r) => r.studentId?.rollNumber === '23CS001');
  assert.ok(student1Log);
  assert.equal(student1Log.studentId?.gender, 'Male');

  // Find Student 2 (Female) record
  const student2Log = logsRes.body.records.find((r) => r.studentId?.rollNumber === '23CS002');
  assert.ok(student2Log);
  assert.equal(student2Log.studentId?.gender, 'Female');

  // Filter by GIRLS only
  const girlsLogsRes = await makeRequest(
    'GET',
    '/api/admin/attendance?gender=GIRLS',
    null,
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.equal(girlsLogsRes.status, 200);
  assert.ok(girlsLogsRes.body.records.length > 0);
  assert.ok(girlsLogsRes.body.records.every((r) => r.studentId?.gender === 'Female'));

  // Filter by BOYS only
  const boysLogsRes = await makeRequest(
    'GET',
    '/api/admin/attendance?gender=BOYS',
    null,
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.equal(boysLogsRes.status, 200);
  assert.ok(boysLogsRes.body.records.length > 0);
  assert.ok(boysLogsRes.body.records.every((r) => r.studentId?.gender === 'Male'));
});

test('Student Attendance Percentage: Admin can edit student attendance percentage via PATCH and PUT endpoints', async () => {
  // 1. Student attempts to update percentage -> 403 Forbidden
  const forbiddenRes = await makeRequest(
    'PATCH',
    `/api/students/${student1._id}/attendance-percentage`,
    { attendancePercentage: 88 },
    { Authorization: `Bearer ${student1Token}` }
  );
  assert.equal(forbiddenRes.status, 403);

  // 2. Admin updates attendance percentage to 85%
  const updateRes = await makeRequest(
    'PATCH',
    `/api/students/${student1._id}/attendance-percentage`,
    { attendancePercentage: 85 },
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.success, true);
  assert.equal(updateRes.body.student.attendancePercentage, 85);

  // 3. Verify in database
  const updatedStudent = await Student.findById(student1._id);
  assert.equal(updatedStudent.attendancePercentage, 85);

  // 4. Test boundary value clamping (e.g., > 100 clamps to 100)
  const clampRes = await makeRequest(
    'PATCH',
    `/api/students/${student1._id}/attendance-percentage`,
    { attendancePercentage: 120 },
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.equal(clampRes.status, 200);
  assert.equal(clampRes.body.student.attendancePercentage, 100);

  // 5. Test invalid value returns 400 Bad Request
  const badReq = await makeRequest(
    'PATCH',
    `/api/students/${student1._id}/attendance-percentage`,
    { attendancePercentage: 'invalid_number' },
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.equal(badReq.status, 400);

  // 6. Test full edit PUT /api/students/:id updates attendancePercentage
  const putRes = await makeRequest(
    'PUT',
    `/api/students/${student2._id}`,
    {
      name: 'Aditi Rao',
      department: 'Information Technology',
      year: '3rd Year',
      attendancePercentage: 92,
    },
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.equal(putRes.status, 200);
  assert.equal(putRes.body.student.attendancePercentage, 92);
});

test('Delete Trip Attendance: Admin can delete a trip, freeing up database storage space and recalculating statistics', async () => {
  // 1. Driver starts a new trip
  const startTripRes = await makeRequest(
    'POST',
    '/api/trips/start',
    {
      session: 'SPECIAL',
      latitude: 13.0827,
      longitude: 80.2707,
      geofenceRadius: 100,
    },
    { Authorization: `Bearer ${driverToken}` }
  );
  assert.equal(startTripRes.status, 201);
  const tripToDelete = startTripRes.body.trip;
  const qrToken = startTripRes.body.initialQR.token;

  // Log in student 1 for this trip
  const logTrip = await makeRequest('POST', '/api/auth/login', {
    identifier: student1.rollNumber,
    password: 'StudentPassword123',
  });
  student1Token = logTrip.body.token;

  // 2. Mark attendance for Student 1
  const markRes = await makeRequest(
    'POST',
    '/api/attendance/mark',
    {
      qrToken,
      deviceIdentifier: 'DEVICE_UUID_PHONE_01',
      latitude: 13.0827,
      longitude: 80.2707,
      gpsAccuracy: 10,
    },
    { Authorization: `Bearer ${student1Token}` }
  );
  assert.equal(markRes.status, 201);

  // 3. Stop the trip (completes it, increments attendedClasses & totalClasses)
  const stopRes = await makeRequest(
    'POST',
    '/api/trips/stop',
    {},
    { Authorization: `Bearer ${driverToken}` }
  );
  assert.equal(stopRes.status, 200);

  // Verify attendance record and QR token exist in database
  const attCountBefore = await Attendance.countDocuments({ tripId: tripToDelete._id });
  const qrCountBefore = await QRCode.countDocuments({ tripId: tripToDelete._id });
  assert.ok(attCountBefore >= 1);
  assert.ok(qrCountBefore >= 1);

  // 4. Non-admin (Student) attempts to delete -> 403 Forbidden
  const studentDeleteRes = await makeRequest(
    'DELETE',
    `/api/trips/${tripToDelete._id}`,
    null,
    { Authorization: `Bearer ${student1Token}` }
  );
  assert.equal(studentDeleteRes.status, 403);

  // 5. Admin deletes the trip
  const adminDeleteRes = await makeRequest(
    'DELETE',
    `/api/trips/${tripToDelete._id}`,
    null,
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.equal(adminDeleteRes.status, 200);
  assert.equal(adminDeleteRes.body.success, true);
  assert.ok(adminDeleteRes.body.freedSpace.attendanceRecords >= 1);
  assert.ok(adminDeleteRes.body.freedSpace.qrCodes >= 1);
  assert.equal(adminDeleteRes.body.freedSpace.trips, 1);

  // 6. Verify MongoDB records have been purged (freeing up space)
  const attCountAfter = await Attendance.countDocuments({ tripId: tripToDelete._id });
  const qrCountAfter = await QRCode.countDocuments({ tripId: tripToDelete._id });
  const tripInDb = await BusTrip.findById(tripToDelete._id);

  assert.equal(attCountAfter, 0);
  assert.equal(qrCountAfter, 0);
  assert.equal(tripInDb, null);
});

test('24. Concurrent Student Logins: 55+ simultaneous student logins from the same network/IP succeed without 15-minute rate limit lockout', async () => {
  // Simulate 55 concurrent logins from the same client IP
  const loginPromises = [];
  for (let i = 0; i < 55; i++) {
    loginPromises.push(
      makeRequest('POST', '/api/auth/login', {
        identifier: '23CS001',
        password: 'StudentPassword123',
      })
    );
  }

  const results = await Promise.all(loginPromises);
  const successfulLogins = results.filter((r) => r.status === 200);
  const rateLimitedLogins = results.filter((r) => r.status === 429);

  assert.equal(successfulLogins.length, 55, 'All 55 students must be able to log in concurrently');
  assert.equal(rateLimitedLogins.length, 0, 'No student should receive a 429 rate limit error');
});

test('25. Live Driver GPS & Running Bus Geofence: Driver updates location live and student attendance succeeds on running bus', async () => {
  // 1. Driver starts a trip
  const startTripRes = await makeRequest(
    'POST',
    '/api/trips/start',
    {
      session: 'MORNING',
      latitude: 13.0827,
      longitude: 80.2707,
      geofenceRadius: 100,
    },
    { Authorization: `Bearer ${driverToken}` }
  );
  assert.equal(startTripRes.status, 201);
  const qrToken = startTripRes.body.initialQR.token;

  // Student 2 logs in for this trip
  const log2 = await makeRequest('POST', '/api/auth/login', {
    identifier: student2.rollNumber,
    password: 'StudentPassword123',
  });
  student2Token = log2.body.token;

  // 2. Bus is running: driver live location updates every second as the bus travels along route
  const updateLocRes = await makeRequest(
    'POST',
    '/api/trips/location',
    {
      latitude: 13.0850,
      longitude: 80.2720,
    },
    { Authorization: `Bearer ${driverToken}` }
  );
  assert.equal(updateLocRes.status, 200);
  assert.equal(updateLocRes.body.currentLocation.latitude, 13.0850);
  assert.equal(updateLocRes.body.currentLocation.longitude, 80.2720);

  // 3. Student 2 on the moving bus scans the QR code with live coordinates matching the running bus
  const studentScanRes = await makeRequest(
    'POST',
    '/api/attendance/mark',
    {
      qrToken,
      deviceIdentifier: 'DEVICE_UUID_PHONE_02',
      latitude: 13.0851, // ~15-20 meters from running bus driver position
      longitude: 80.2721,
      gpsAccuracy: 15,
    },
    { Authorization: `Bearer ${student2Token}` }
  );

  assert.equal(studentScanRes.status, 201, 'Student attendance should succeed on running bus');
  assert.equal(studentScanRes.body.success, true);
  assert.equal(studentScanRes.body.attendance.status, 'PRESENT');

  // 4. Stop the trip
  await makeRequest('POST', '/api/trips/stop', {}, { Authorization: `Bearer ${driverToken}` });
});

test('26. Student Continuous Live GPS & Per-Trip Authentication Lifecycle: GPS is never locked and fresh login required per trip', async () => {
  // 1. Start Trip A
  const tripARes = await makeRequest(
    'POST',
    '/api/trips/start',
    {
      session: 'MORNING',
      latitude: 13.0827,
      longitude: 80.2707,
      geofenceRadius: 100,
    },
    { Authorization: `Bearer ${driverToken}` }
  );
  assert.equal(tripARes.status, 201);
  const tripAId = tripARes.body.trip._id;

  // 2. Student 1 logs in for Trip A
  const loginARes = await makeRequest('POST', '/api/auth/login', {
    identifier: student1.rollNumber,
    password: 'StudentPassword123',
  });
  assert.equal(loginARes.status, 200);
  assert.equal(loginARes.body.user.authenticatedTripId, tripAId);
  const tokenTripA = loginARes.body.token;

  // 3. Student continuous GPS streaming: position 1 -> position 2 (never locked to login location)
  const gps1Res = await makeRequest(
    'POST',
    '/api/students/location',
    { latitude: 13.0830, longitude: 80.2710, accuracy: 8 },
    { Authorization: `Bearer ${tokenTripA}` }
  );
  assert.equal(gps1Res.status, 200);
  assert.equal(gps1Res.body.location.latitude, 13.0830);

  const gps2Res = await makeRequest(
    'POST',
    '/api/students/location',
    { latitude: 13.0865, longitude: 80.2745, accuracy: 5 },
    { Authorization: `Bearer ${tokenTripA}` }
  );
  assert.equal(gps2Res.status, 200);
  assert.equal(gps2Res.body.location.latitude, 13.0865);

  // 4. Verify /api/auth/me reports isTripAuthenticated: true for Trip A
  const meResA = await makeRequest('GET', '/api/auth/me', null, {
    Authorization: `Bearer ${tokenTripA}`,
  });
  assert.equal(meResA.status, 200);
  assert.equal(meResA.body.isTripAuthenticated, true);

  // 5. Driver stops Trip A
  await makeRequest('POST', '/api/trips/stop', {}, { Authorization: `Bearer ${driverToken}` });

  // 6. Driver starts Trip B (new trip)
  const tripBRes = await makeRequest(
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
  assert.equal(tripBRes.status, 201);
  const tripBQR = tripBRes.body.initialQR.token;

  // 7. Student attempts to mark attendance on Trip B with token from Trip A -> REJECTED (401 requireTripLogin)
  const rejectedRes = await makeRequest(
    'POST',
    '/api/attendance/mark',
    {
      qrToken: tripBQR,
      deviceIdentifier: 'DEVICE_UUID_PHONE_01',
      latitude: 13.0827,
      longitude: 80.2707,
      gpsAccuracy: 10,
    },
    { Authorization: `Bearer ${tokenTripA}` }
  );
  assert.equal(rejectedRes.status, 401);
  assert.equal(rejectedRes.body.requireTripLogin, true);

  // 8. Student logs in fresh for Trip B
  const loginBRes = await makeRequest('POST', '/api/auth/login', {
    identifier: student1.rollNumber,
    password: 'StudentPassword123',
  });
  assert.equal(loginBRes.status, 200);
  assert.equal(loginBRes.body.user.authenticatedTripId, tripBRes.body.trip._id);
  const tokenTripB = loginBRes.body.token;

  // 9. Now Student marks attendance on Trip B -> SUCCEEDS (201)
  const acceptedRes = await makeRequest(
    'POST',
    '/api/attendance/mark',
    {
      qrToken: tripBQR,
      deviceIdentifier: 'DEVICE_UUID_PHONE_01',
      latitude: 13.0827,
      longitude: 80.2707,
      gpsAccuracy: 10,
    },
    { Authorization: `Bearer ${tokenTripB}` }
  );
  assert.equal(acceptedRes.status, 201);
  assert.equal(acceptedRes.body.success, true);

  // 10. Clean up: stop Trip B
  await makeRequest('POST', '/api/trips/stop', {}, { Authorization: `Bearer ${driverToken}` });
});

test('27. Device Management: Admin unbinds all devices, clearing Device collection and resetting student registration status', async () => {
  // 1. Verify that student1 and student2 have active device records
  const devicesBefore = await Device.find({});
  assert.ok(devicesBefore.length > 0, 'Should have registered devices in DB');

  // 2. Non-admin (Student/Driver) attempts to unbind all devices -> REJECTED (403)
  const forbiddenRes = await makeRequest('POST', '/api/devices/unbind-all', {}, {
    Authorization: `Bearer ${student1Token}`,
  });
  assert.equal(forbiddenRes.status, 403);

  // 3. Admin calls unbind-all endpoint -> SUCCEEDS (200)
  const unbindRes = await makeRequest('POST', '/api/devices/unbind-all', {}, {
    Authorization: `Bearer ${adminToken}`,
  });
  assert.equal(unbindRes.status, 200);
  assert.equal(unbindRes.body.success, true);
  assert.ok(unbindRes.body.deletedCount >= 1);
  assert.match(unbindRes.body.message, /All devices unbound successfully/);

  // 4. Verify in database: Device collection is completely empty
  const devicesAfter = await Device.find({});
  assert.equal(devicesAfter.length, 0, 'Device collection must be empty after unbind all');

  // 5. Verify students in database: deviceId is null and deviceRegistrationStatus is false
  const updatedStudent1 = await Student.findById(student1._id);
  assert.equal(updatedStudent1.deviceId, null);
  assert.equal(updatedStudent1.deviceRegistrationStatus, false);

  const updatedStudent2 = await Student.findById(student2._id);
  assert.equal(updatedStudent2.deviceId, null);
  assert.equal(updatedStudent2.deviceRegistrationStatus, false);

  // 6. Student can now bind a brand new device
  const rebindRes = await makeRequest(
    'POST',
    '/api/devices/register',
    {
      deviceIdentifier: 'NEW_PHONE_UUID_999',
      userAgent: 'Mozilla/5.0 NewPhoneTest',
    },
    { Authorization: `Bearer ${student1Token}` }
  );
  assert.equal(rebindRes.status, 201);
  assert.equal(rebindRes.body.success, true);
  assert.equal(rebindRes.body.device.deviceIdentifier, 'NEW_PHONE_UUID_999');

  const student1AfterRebind = await Student.findById(student1._id);
  assert.equal(student1AfterRebind.deviceId, 'NEW_PHONE_UUID_999');
  assert.equal(student1AfterRebind.deviceRegistrationStatus, true);
});

test('28. 55 Concurrent Students: All 55 students log in and mark attendance simultaneously on the same trip', async () => {
  // 1. Driver starts a trip
  const tripRes = await makeRequest(
    'POST',
    '/api/trips/start',
    {
      session: 'EVENING',
      latitude: 13.0827,
      longitude: 80.2707,
      geofenceRadius: 3000,
    },
    { Authorization: `Bearer ${driverToken}` }
  );
  assert.equal(tripRes.status, 201);
  const qrToken = tripRes.body.initialQR.token;
  const activeTripId = tripRes.body.trip._id;

  // 2. Prepare 55 student test accounts
  const studentList = [];
  for (let i = 1; i <= 55; i++) {
    const roll = `23TEST${String(i).padStart(3, '0')}`;
    const devId = `DEV_SIM_55_${String(i).padStart(3, '0')}`;
    const email = `test55_${i}@college.edu`;

    let u = await User.findOne({ email });
    if (!u) {
      u = await User.create({
        name: `Concurrent Student ${i}`,
        email,
        password: 'StudentPassword123',
        role: 'STUDENT',
      });
    }

    let s = await Student.findOne({ rollNumber: roll });
    if (!s) {
      s = await Student.create({
        userId: u._id,
        studentId: `STD-${roll}`,
        rollNumber: roll,
        name: `Concurrent Student ${i}`,
        email,
        department: 'IT',
        year: '3rd Year',
        gender: i % 2 === 0 ? 'Female' : 'Male',
        deviceId: devId,
        deviceRegistrationStatus: true,
      });
      await Device.create({
        studentId: s._id,
        deviceIdentifier: devId,
        status: 'ACTIVE',
      });
    } else {
      await Student.updateOne({ _id: s._id }, { $set: { deviceId: devId, deviceRegistrationStatus: true } });
      await Device.findOneAndUpdate(
        { studentId: s._id },
        { deviceIdentifier: devId, status: 'ACTIVE' },
        { upsert: true }
      );
    }

    studentList.push({ user: u, student: s, roll, devId });
  }

  // 3. Concurrently log in all 55 students for this trip
  const loginPromises = studentList.map((st) =>
    makeRequest('POST', '/api/auth/login', {
      identifier: st.roll,
      password: 'StudentPassword123',
    })
  );
  const loginResponses = await Promise.all(loginPromises);
  const successfulLogins = loginResponses.filter((r) => r.status === 200);
  assert.equal(successfulLogins.length, 55, 'All 55 students successfully log in concurrently');

  const studentTokens = loginResponses.map((r) => r.body.token);

  // 4. Concurrently submit attendance for all 55 students at the exact same moment
  const attendancePromises = studentList.map((st, idx) =>
    makeRequest(
      'POST',
      '/api/attendance/mark',
      {
        qrToken,
        deviceIdentifier: st.devId,
        latitude: 13.0827 + idx * 0.00001, // within 5-10 meters of bus
        longitude: 80.2707 + idx * 0.00001,
        gpsAccuracy: 10,
      },
      { Authorization: `Bearer ${studentTokens[idx]}` }
    )
  );

  const attendanceResponses = await Promise.all(attendancePromises);
  const successfulAttendance = attendanceResponses.filter((r) => r.status === 201);
  const failedAttendance = attendanceResponses.filter((r) => r.status !== 201);

  assert.equal(failedAttendance.length, 0, `No failures allowed: ${JSON.stringify(failedAttendance.map((f) => f.body))}`);
  assert.equal(successfulAttendance.length, 55, 'All 55 students successfully mark attendance concurrently');

  // 5. Verify 55 distinct attendance records in MongoDB
  const totalMarked = await Attendance.countDocuments({ tripId: activeTripId, status: 'PRESENT' });
  assert.equal(totalMarked, 55, 'Database must contain exactly 55 PRESENT records for this trip');
});

test('29. Admin Edit Student Credentials: Admin can update username and password for students, and student can log in with updated credentials', async () => {
  // 1. Admin updates student3's username to 'vikram_singh_test' and password to 'VikramNewPass2026'
  const updateRes = await makeRequest(
    'PUT',
    `/api/students/${student3._id}/credentials`,
    {
      username: 'vikram_singh_test',
      password: 'VikramNewPass2026',
    },
    { Authorization: `Bearer ${adminToken}` }
  );

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.success, true);
  assert.equal(updateRes.body.user.username, 'vikram_singh_test');
  assert.equal(updateRes.body.currentPassword, 'VikramNewPass2026');

  // Verify GET /api/students exposes currentPassword for admin visibility
  const listRes = await makeRequest('GET', '/api/students', null, {
    Authorization: `Bearer ${adminToken}`,
  });
  assert.equal(listRes.status, 200);
  const foundStudent3 = listRes.body.students.find((s) => s._id === student3._id.toString());
  assert.equal(foundStudent3?.currentPassword, 'VikramNewPass2026');

  // 2. Student3 logs in with the new username and new password
  const loginRes = await makeRequest('POST', '/api/auth/login', {
    identifier: 'vikram_singh_test',
    password: 'VikramNewPass2026',
  });

  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.body.success, true);
  assert.equal(loginRes.body.user.username, 'vikram_singh_test');

  // 3. Attempting to set username to one that already exists fails with 400
  const duplicateRes = await makeRequest(
    'PUT',
    `/api/students/${student1._id}/credentials`,
    {
      username: 'vikram_singh_test',
    },
    { Authorization: `Bearer ${adminToken}` }
  );

  assert.equal(duplicateRes.status, 400);
  assert.equal(duplicateRes.body.success, false);
});

test('30. Admin Delete Student: Permanently deletes student profile, user account, devices, and attendance from database', async () => {
  // 1. Create a dummy student with linked User, Device, and Attendance
  const delUser = await User.create({
    name: 'Delete Target Student',
    username: 'delete_target',
    email: 'delete_target@college.edu',
    password: 'TargetPassword123',
    role: 'STUDENT',
  });

  const delStudent = await Student.create({
    userId: delUser._id,
    studentId: 'STD-DEL001',
    rollNumber: 'DEL001',
    name: 'Delete Target Student',
    email: delUser.email,
    department: 'CSE',
    year: '1st Year',
    gender: 'Male',
  });

  await Device.create({
    studentId: delStudent._id,
    deviceIdentifier: 'DEVICE_UUID_TO_DELETE',
    status: 'ACTIVE',
  });

  await Attendance.create({
    studentId: delStudent._id,
    tripId: activeTrip._id,
    deviceId: 'DEVICE_UUID_TO_DELETE',
    status: 'PRESENT',
    latitude: 13.0827,
    longitude: 80.2707,
    distanceMeters: 5,
    gpsAccuracy: 10,
  });

  // 2. Admin calls DELETE /api/students/:id
  const deleteRes = await makeRequest(
    'DELETE',
    `/api/students/${delStudent._id}`,
    null,
    { Authorization: `Bearer ${adminToken}` }
  );

  assert.equal(deleteRes.status, 200);
  assert.equal(deleteRes.body.success, true);

  // 3. Verify all records are deleted from MongoDB collections
  const checkStudent = await Student.findById(delStudent._id);
  assert.equal(checkStudent, null, 'Student document must be deleted');

  const checkUser = await User.findById(delUser._id);
  assert.equal(checkUser, null, 'User auth document must be deleted');

  const checkDevice = await Device.findOne({ studentId: delStudent._id });
  assert.equal(checkDevice, null, 'Device record must be deleted');

  const checkAttendance = await Attendance.findOne({ studentId: delStudent._id });
  assert.equal(checkAttendance, null, 'Attendance record must be deleted');

  // 4. Calling delete on non-existent student returns 404
  const notFoundRes = await makeRequest(
    'DELETE',
    `/api/students/${delStudent._id}`,
    null,
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.equal(notFoundRes.status, 404);
});

test('31. First-Time Student Attendance: Automatically binds first-time device on scan when no prior device was registered', async () => {
  // 1. Create a fresh student without any registered device
  const freshUser = await User.create({
    name: 'Pravinaa Test',
    username: 'pravinaa_test',
    email: 'pravinaa_test@college.edu',
    password: 'PravinaaPassword123',
    role: 'STUDENT',
  });

  const freshStudent = await Student.create({
    userId: freshUser._id,
    studentId: 'STD-23CS039-TEST',
    rollNumber: '23CS039-TEST',
    name: 'Pravinaa Test',
    email: freshUser.email,
    department: 'CSBS',
    year: '3rd Year',
    gender: 'Female',
    deviceId: null,
    deviceRegistrationStatus: false,
    lastLoginTripId: activeTrip._id,
  });

  // Verify no device exists for this student initially
  const beforeDev = await Device.findOne({ studentId: freshStudent._id });
  assert.equal(beforeDev, null);

  // Student logs in for the active trip
  const loginRes = await makeRequest('POST', '/api/auth/login', {
    identifier: freshStudent.rollNumber,
    password: 'PravinaaPassword123',
  });
  assert.equal(loginRes.status, 200);
  const freshToken = loginRes.body.token;

  // Student scans dynamic QR with their phone
  const qrRes = await makeRequest('GET', '/api/qr/current', null, {
    Authorization: `Bearer ${driverToken}`,
  });
  const currentToken = qrRes.body.token;

  const firstScanRes = await makeRequest(
    'POST',
    '/api/attendance/mark',
    {
      qrToken: currentToken,
      deviceIdentifier: 'PRAVINAA_PHONE_HARDWARE_UUID_039',
      latitude: 13.0827,
      longitude: 80.2707,
      gpsAccuracy: 10,
    },
    { Authorization: `Bearer ${freshToken}` }
  );

  assert.equal(firstScanRes.status, 201);
  assert.equal(firstScanRes.body.success, true);
  assert.equal(firstScanRes.body.attendance.status, 'PRESENT');

  // Verify that device was automatically registered in Device collection
  const boundDev = await Device.findOne({ studentId: freshStudent._id });
  assert.ok(boundDev);
  assert.equal(boundDev.deviceIdentifier, 'PRAVINAA_PHONE_HARDWARE_UUID_039');

  // Verify that student profile reflects the bound device
  const updatedStudent = await Student.findById(freshStudent._id);
  assert.equal(updatedStudent.deviceRegistrationStatus, true);
  assert.equal(updatedStudent.deviceId, 'PRAVINAA_PHONE_HARDWARE_UUID_039');

  // Verify getAllStudents accurately returns deviceRegistrationStatus: true
  const listRes = await makeRequest('GET', `/api/students?search=${encodeURIComponent(freshStudent.rollNumber)}`, null, {
    Authorization: `Bearer ${adminToken}`,
  });
  assert.equal(listRes.status, 200);
  const foundStudent = listRes.body.students.find((s) => s.rollNumber === freshStudent.rollNumber);
  assert.ok(foundStudent);
  assert.equal(foundStudent.deviceRegistrationStatus, true);

  // Admin resets this student's device
  const resetRes = await makeRequest('POST', `/api/devices/reset/${freshStudent._id}`, null, {
    Authorization: `Bearer ${adminToken}`,
  });
  assert.equal(resetRes.status, 200);
  assert.equal(resetRes.body.success, true);

  // Verify student is now Unbound in database and in getAllStudents
  const resetDev = await Device.findOne({ studentId: freshStudent._id });
  assert.equal(resetDev, null);
  const postResetStudent = await Student.findById(freshStudent._id);
  assert.equal(postResetStudent.deviceRegistrationStatus, false);
  assert.equal(postResetStudent.deviceId, null);

  const listPostReset = await makeRequest('GET', `/api/students?search=${encodeURIComponent(freshStudent.rollNumber)}`, null, {
    Authorization: `Bearer ${adminToken}`,
  });
  const foundReset = listPostReset.body.students.find((s) => s.rollNumber === freshStudent.rollNumber);
  assert.equal(foundReset.deviceRegistrationStatus, false);
});










