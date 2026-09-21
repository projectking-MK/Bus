import { Attendance } from '../models/Attendance.js';
import { BusTrip } from '../models/BusTrip.js';
import { QRCode } from '../models/QRCode.js';
import { Device } from '../models/Device.js';
import { Student } from '../models/Student.js';
import { AuditLog } from '../models/AuditLog.js';
import { calculateDistance, validateGeofence } from '../utils/geofence.js';

export const markAttendance = async (req, res) => {
  const student = req.student;
  const user = req.user;
  const { qrToken, deviceIdentifier, latitude, longitude, gpsAccuracy } = req.body;

  try {
    // 1 & 2. Role and Student Profile verification
    if (!student || user.role !== 'STUDENT') {
      return res.status(403).json({
        success: false,
        message: 'Only registered students are permitted to mark attendance.',
      });
    }

    // 3. Account active status
    if (student.accountStatus !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Student account is suspended.',
      });
    }

    // 4. Device presence check
    const deviceId = deviceIdentifier || req.headers['x-device-id'];
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device identifier is required for attendance verification.',
      });
    }

    // 5. Active bus trip check
    const activeTrip = await BusTrip.findOne({ status: 'ACTIVE' });
    if (!activeTrip) {
      return res.status(400).json({
        success: false,
        message: 'Attendance is currently closed.',
      });
    }

    // 5a. Student Per-Trip Login Enforcement: Student must log in specifically for each active trip
    const studentTripId = req.user.authenticatedTripId || (student.lastLoginTripId ? student.lastLoginTripId.toString() : null);
    if (!studentTripId || studentTripId !== activeTrip._id.toString()) {
      return res.status(401).json({
        success: false,
        requireTripLogin: true,
        message: `Please log in to authenticate for ${activeTrip.sessionName || 'this active trip'} before marking attendance.`,
      });
    }

    // 5b. Anti-Proxy Single Device Check: Ensure this physical hardware device has NOT already marked attendance for ANY other student on this active trip!
    const deviceUsedOnTrip = await Attendance.findOne({
      tripId: activeTrip._id,
      deviceId: deviceId,
      studentId: { $ne: student._id },
    }).populate('studentId', 'rollNumber name');

    if (deviceUsedOnTrip) {
      const priorStudent = deviceUsedOnTrip.studentId;
      const priorInfo = priorStudent ? `${priorStudent.rollNumber} (${priorStudent.name})` : 'another student';

      await AuditLog.create({
        action: 'ATTENDANCE_BLOCKED_DEVICE_REUSED_ON_TRIP',
        performedBy: user._id,
        targetStudentId: student._id,
        details: {
          deviceId,
          tripId: activeTrip.tripId,
          alreadyUsedFor: priorInfo,
        },
        ipAddress: req.ip || '',
        status: 'FAILURE',
      });

      return res.status(403).json({
        success: false,
        message: `Anti-Proxy Violation: This device has already marked attendance for ${priorInfo} on this trip. A single device cannot be used to mark attendance for multiple students.`,
      });
    }

    // 6. Student Device registration verification
    let registeredDevice = await Device.findOne({ studentId: student._id });
    if (!registeredDevice) {
      // Check if this physical device is already bound to another student
      const deviceBoundToOther = await Device.findOne({
        deviceIdentifier: deviceId,
        studentId: { $ne: student._id },
      }).populate('studentId', 'rollNumber name');

      if (deviceBoundToOther) {
        const otherStudent = deviceBoundToOther.studentId;
        if (otherStudent) {
          const otherInfo = `${otherStudent.rollNumber} (${otherStudent.name})`;

          await AuditLog.create({
            action: 'DEVICE_REGISTRATION_REJECTED_ALREADY_BOUND',
            performedBy: user._id,
            targetStudentId: student._id,
            details: { deviceIdentifier: deviceId, alreadyBoundTo: otherInfo },
            ipAddress: req.ip || '',
            status: 'WARNING',
          });

          return res.status(403).json({
            success: false,
            message: `Anti-Proxy Security: This device is already registered to ${otherInfo}. A physical device cannot be shared between students. Each student must use their own phone.`,
          });
        } else {
          // Clean up orphaned device record from a deleted student
          await Device.deleteOne({ _id: deviceBoundToOther._id });
        }
      }

      // First-time device registration: automatically bind this device to the student (upsert prevents race conditions)
      registeredDevice = await Device.findOneAndUpdate(
        { studentId: student._id },
        {
          $set: {
            deviceIdentifier: deviceId,
            userAgent: req.headers['user-agent'] || '',
            ipAddress: req.ip || '',
            lastUsedAt: new Date(),
            status: 'ACTIVE',
          },
          $setOnInsert: {
            registeredAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );

      student.deviceId = deviceId;
      student.deviceRegistrationStatus = true;
      await student.save();

      await AuditLog.create({
        action: 'DEVICE_REGISTERED',
        performedBy: user._id,
        targetStudentId: student._id,
        details: { deviceIdentifier: deviceId, autoRegisteredOnScan: true },
        ipAddress: req.ip || '',
        status: 'SUCCESS',
      });
    } else if (registeredDevice.deviceIdentifier !== deviceId) {
      await AuditLog.create({
        action: 'ATTENDANCE_BLOCKED_DEVICE_MISMATCH',
        performedBy: user._id,
        targetStudentId: student._id,
        details: { providedDeviceId: deviceId, registeredDeviceId: registeredDevice.deviceIdentifier },
        ipAddress: req.ip || '',
        status: 'FAILURE',
      });

      return res.status(403).json({
        success: false,
        message: 'This account is registered to another device.',
      });
    } else {
      registeredDevice.lastUsedAt = new Date();
      await registeredDevice.save();

      // Ensure student document has deviceId and deviceRegistrationStatus synchronized
      if (!student.deviceRegistrationStatus || student.deviceId !== deviceId) {
        student.deviceId = deviceId;
        student.deviceRegistrationStatus = true;
        await student.save();
      }
    }

    // 6, 7 & 8. Dynamic QR validation
    if (!qrToken) {
      return res.status(400).json({
        success: false,
        message: 'QR token is required.',
      });
    }

    const qrRecord = await QRCode.findOne({ token: qrToken });
    if (!qrRecord || qrRecord.tripId.toString() !== activeTrip._id.toString() || !qrRecord.isActive) {
      return res.status(400).json({
        success: false,
        message: 'QR code expired. Please scan the current QR.',
      });
    }

    if (new Date(qrRecord.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'QR code expired. Please scan the current QR.',
      });
    }

    // 9. Check if this specific token was already scanned by this student (prevent replay)
    const existingScanWithToken = await Attendance.findOne({
      studentId: student._id,
      qrTokenId: qrRecord._id,
    });
    if (existingScanWithToken) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this trip.',
      });
    }

    // 10. Student GPS validation
    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
      return res.status(400).json({
        success: false,
        message: 'Please enable location permission.',
      });
    }

    const sLat = Number(latitude);
    const sLon = Number(longitude);
    const sAccuracy = Number(gpsAccuracy);

    if (isNaN(sLat) || isNaN(sLon)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid GPS coordinates provided.',
      });
    }

    const allowedRadius = activeTrip.geofenceRadius || 100;
    const maxAccuracy = Math.max(100, Math.min(allowedRadius * 0.1, 1000));

    // 11. GPS Accuracy verification (Reject low accuracy / cell tower approximations)
    if (isNaN(sAccuracy) || sAccuracy > maxAccuracy) {
      return res.status(400).json({
        success: false,
        message: 'GPS accuracy is too low. Please enable high-accuracy location.',
      });
    }

    // 12. Geofence verification against bus location
    // Bus location: current driver coordinates, fallback to trip start or default center
    const busLat = activeTrip.currentLatitude ?? activeTrip.startLatitude;
    const busLon = activeTrip.currentLongitude ?? activeTrip.startLongitude;

    if (busLat === null || busLon === null || busLat === undefined || busLon === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Bus GPS is temporarily unavailable. Attendance cannot be verified.',
      });
    }

    let geofenceResult = validateGeofence(
      sLat,
      sLon,
      sAccuracy,
      busLat,
      busLon,
      allowedRadius,
      maxAccuracy
    );

    // If check against current coordinates failed, fallback to start coordinates if available
    if (!geofenceResult.isInside && activeTrip.startLatitude != null && activeTrip.startLongitude != null) {
      const startResult = validateGeofence(
        sLat,
        sLon,
        sAccuracy,
        activeTrip.startLatitude,
        activeTrip.startLongitude,
        allowedRadius,
        maxAccuracy
      );
      if (startResult.isInside) {
        geofenceResult = startResult;
      }
    }

    if (!geofenceResult.isInside) {
      await AuditLog.create({
        action: 'ATTENDANCE_BLOCKED_GEOFENCE',
        performedBy: user._id,
        targetStudentId: student._id,
        details: {
          distance: geofenceResult.distanceMeters,
          allowedRadius,
          studentLat: sLat,
          studentLon: sLon,
          busLat,
          busLon,
        },
        ipAddress: req.ip || '',
        status: 'WARNING',
      });

      return res.status(400).json({
        success: false,
        message: geofenceResult.error || 'You are outside the permitted bus area.',
        detail: geofenceResult.detail,
        distanceMeters: geofenceResult.distanceMeters,
      });
    }

    // 13. Duplicate attendance verification (Compound check)
    const existingAttendance = await Attendance.findOne({
      studentId: student._id,
      tripId: activeTrip._id,
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this trip.',
      });
    }

    // 14. Server timestamp and record creation
    const serverTimestamp = new Date();

    const attendanceRecord = await Attendance.create({
      studentId: student._id,
      tripId: activeTrip._id,
      date: serverTimestamp,
      markedAt: serverTimestamp,
      latitude: sLat,
      longitude: sLon,
      gpsAccuracy: sAccuracy,
      deviceId: registeredDevice.deviceIdentifier,
      qrTokenId: qrRecord._id,
      status: 'PRESENT',
      distanceMeters: geofenceResult.distanceMeters,
      validationResult: {
        deviceValid: true,
        qrValid: true,
        gpsValid: true,
        tripActive: true,
        distanceMeters: geofenceResult.distanceMeters,
        serverTime: serverTimestamp.toISOString(),
      },
    });

    // Update active trip's current location with verified student's GPS on the moving bus (atomic update)
    await BusTrip.updateOne(
      { _id: activeTrip._id },
      {
        $set: {
          currentLatitude: sLat,
          currentLongitude: sLon,
          lastLocationUpdate: serverTimestamp,
        },
      }
    );

    // Update registered device's lastUsedAt
    registeredDevice.lastUsedAt = serverTimestamp;
    await registeredDevice.save();

    // Log attendance success
    await AuditLog.create({
      action: 'ATTENDANCE_MARKED_PRESENT',
      performedBy: user._id,
      targetStudentId: student._id,
      details: {
        tripId: activeTrip.tripId,
        distanceMeters: geofenceResult.distanceMeters,
        deviceId: registeredDevice.deviceIdentifier,
      },
      ipAddress: req.ip || '',
      status: 'SUCCESS',
    });

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully.',
      attendance: {
        id: attendanceRecord._id,
        rollNumber: student.rollNumber,
        name: student.name,
        status: attendanceRecord.status,
        markedAt: attendanceRecord.markedAt,
        distanceMeters: attendanceRecord.distanceMeters,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.deviceId || (error.message && error.message.includes('deviceId'))) {
        return res.status(403).json({
          success: false,
          message: 'Anti-Proxy Violation: This device has already marked attendance for another student on this trip.',
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this trip.',
      });
    }

    console.error('[Attendance Mark Error]', error);
    res.status(500).json({
      success: false,
      message: 'Server error while recording attendance',
      error: error.message,
    });
  }
};

export const getMyAttendance = async (req, res) => {
  try {
    const student = req.student;
    const history = await Attendance.find({ studentId: student._id })
      .populate('tripId', 'tripId startTime endTime status')
      .sort({ markedAt: -1 });

    const totalMarked = history.filter((h) => h.status === 'PRESENT' || h.status === 'LATE').length;

    res.json({
      success: true,
      count: history.length,
      history,
      stats: {
        totalPresent: totalMarked,
        totalClasses: student.totalClasses || history.length,
        percentage: student.attendancePercentage || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch personal attendance history',
      error: error.message,
    });
  }
};

export const getTodayAttendance = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const filter = {
      markedAt: { $gte: startOfDay, $lte: endOfDay },
    };

    if (req.user.role === 'STUDENT') {
      filter.studentId = req.student._id;
    }

    const records = await Attendance.find(filter)
      .populate('studentId', 'rollNumber name department year gender')
      .populate('tripId', 'tripId status startTime')
      .sort({ markedAt: -1 });

    res.json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch today's attendance",
      error: error.message,
    });
  }
};

export const getActiveTripAttendance = async (req, res) => {
  try {
    const activeTrip = await BusTrip.findOne({ status: 'ACTIVE' });
    if (!activeTrip) {
      return res.json({
        success: true,
        active: false,
        records: [],
      });
    }

    const records = await Attendance.find({ tripId: activeTrip._id })
      .populate('studentId', 'rollNumber name department year phone gender')
      .sort({ markedAt: -1 });

    res.json({
      success: true,
      active: true,
      tripId: activeTrip.tripId,
      count: records.length,
      records,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active trip attendance',
      error: error.message,
    });
  }
};
