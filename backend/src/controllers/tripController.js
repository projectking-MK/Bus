import crypto from 'crypto';
import mongoose from 'mongoose';
import { BusTrip } from '../models/BusTrip.js';
import { Bus } from '../models/Bus.js';
import { QRCode } from '../models/QRCode.js';
import { Attendance } from '../models/Attendance.js';
import { Student } from '../models/Student.js';
import { AuditLog } from '../models/AuditLog.js';

export const startTrip = async (req, res) => {
  try {
    const { busId, latitude, longitude, geofenceRadius } = req.body;

    // Check if there is already an active trip
    const existingActiveTrip = await BusTrip.findOne({ status: 'ACTIVE' }).populate('busId driverId', 'name busNumber routeName');
    if (existingActiveTrip) {
      return res.json({
        success: true,
        message: 'An active trip is already in progress.',
        trip: existingActiveTrip,
      });
    }

    // Find default or specified bus
    let bus = null;
    if (busId) {
      bus = await Bus.findById(busId);
    }
    if (!bus) {
      bus = await Bus.findOne({ isActive: true });
    }
    if (!bus) {
      // Create fallback default bus if database wasn't seeded yet
      bus = await Bus.create({
        busNumber: 'BUS-09',
        routeName: 'College Bus No 09',
        capacity: 68,
        defaultGeofenceRadius: 100,
        defaultCenterLatitude: latitude || 13.0827,
        defaultCenterLongitude: longitude || 80.2707,
      });
    }

    const startLat = latitude !== undefined && latitude !== null ? Number(latitude) : bus.defaultCenterLatitude;
    const startLon = longitude !== undefined && longitude !== null ? Number(longitude) : bus.defaultCenterLongitude;
    const radius = geofenceRadius ? Number(geofenceRadius) : bus.defaultGeofenceRadius;

    // Detect session (Morning vs Evening)
    let tripSession = req.body.session ? req.body.session.toUpperCase() : null;
    if (!tripSession || !['MORNING', 'EVENING', 'SPECIAL'].includes(tripSession)) {
      const currentHour = new Date().getHours();
      tripSession = currentHour < 13 ? 'MORNING' : 'EVENING';
    }
    const sessionName = tripSession === 'MORNING' ? 'Morning Trip' : tripSession === 'EVENING' ? 'Evening Trip' : 'Special Trip';

    const tripId = `TRIP-${tripSession}-${Date.now()}`;

    const newTrip = await BusTrip.create({
      tripId,
      busId: bus._id,
      driverId: req.user._id,
      startTime: new Date(),
      status: 'ACTIVE',
      session: tripSession,
      sessionName,
      startLatitude: startLat,
      startLongitude: startLon,
      currentLatitude: startLat,
      currentLongitude: startLon,
      geofenceRadius: radius,
      lastLocationUpdate: new Date(),
    });

    // Generate initial dynamic QR token (3000s = 50 minutes)
    const token = crypto.randomBytes(16).toString('hex');
    const expirySeconds = parseInt(process.env.QR_EXPIRY_SECONDS || '3000', 10);
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);

    await QRCode.create({
      token,
      tripId: newTrip._id,
      expiresAt,
      isActive: true,
    });

    await AuditLog.create({
      action: 'TRIP_STARTED',
      performedBy: req.user._id,
      details: { tripId: newTrip.tripId, busNumber: bus.busNumber, startLat, startLon, radius },
      ipAddress: req.ip || '',
      status: 'SUCCESS',
    });

    const populatedTrip = await BusTrip.findById(newTrip._id).populate('busId driverId', 'name email busNumber routeName');

    res.status(201).json({
      success: true,
      message: 'Bus trip started successfully. Attendance is now ACTIVE.',
      trip: populatedTrip,
      initialQR: {
        token,
        expiresAt,
        expiresInSeconds: expirySeconds,
      },
    });
  } catch (error) {
    console.error('[Start Trip Error]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start bus trip',
      error: error.message,
    });
  }
};

export const stopTrip = async (req, res) => {
  try {
    const activeTrip = await BusTrip.findOne({ status: 'ACTIVE' }).populate('busId');
    if (!activeTrip) {
      return res.status(400).json({
        success: false,
        message: 'No active bus trip found to stop.',
      });
    }

    activeTrip.status = 'COMPLETED';
    activeTrip.endTime = new Date();
    await activeTrip.save();

    // Deactivate all dynamic QRs for this trip
    await QRCode.updateMany({ tripId: activeTrip._id }, { isActive: false });

    // Calculate attendance numbers for this trip
    const presentCount = await Attendance.countDocuments({
      tripId: activeTrip._id,
      status: { $in: ['PRESENT', 'LATE'] },
    });
    const totalStudents = await Student.countDocuments({ accountStatus: 'ACTIVE' });
    const absentCount = Math.max(0, totalStudents - presentCount);

    // Update attendance statistics for all active students
    // 1. Get all students who were present on this trip
    const presentRecords = await Attendance.find({ tripId: activeTrip._id, status: { $in: ['PRESENT', 'LATE'] } });
    const presentStudentIds = new Set(presentRecords.map((r) => r.studentId.toString()));

    const allStudents = await Student.find({ accountStatus: 'ACTIVE' });
    for (const student of allStudents) {
      const isPresent = presentStudentIds.has(student._id.toString());
      student.totalClasses = (student.totalClasses || 0) + 1;
      if (isPresent) {
        student.attendedClasses = (student.attendedClasses || 0) + 1;
      }
      student.attendancePercentage = student.totalClasses > 0
        ? Math.round((student.attendedClasses / student.totalClasses) * 100)
        : 0;
      await student.save();
    }

    await AuditLog.create({
      action: 'TRIP_STOPPED',
      performedBy: req.user._id,
      details: {
        tripId: activeTrip.tripId,
        presentCount,
        absentCount,
        totalStudents,
      },
      ipAddress: req.ip || '',
      status: 'SUCCESS',
    });

    res.json({
      success: true,
      message: 'Bus trip completed. Attendance is now CLOSED.',
      summary: {
        tripId: activeTrip.tripId,
        startTime: activeTrip.startTime,
        endTime: activeTrip.endTime,
        presentCount,
        absentCount,
        totalStudents,
      },
    });
  } catch (error) {
    console.error('[Stop Trip Error]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop bus trip',
      error: error.message,
    });
  }
};

export const getActiveTrip = async (req, res) => {
  try {
    const activeTrip = await BusTrip.findOne({ status: 'ACTIVE' })
      .populate('busId', 'busNumber routeName capacity defaultGeofenceRadius')
      .populate('driverId', 'name email phone');

    if (!activeTrip) {
      return res.json({
        success: true,
        active: false,
        trip: null,
      });
    }

    const totalStudents = await Student.countDocuments({ accountStatus: 'ACTIVE' });
    const presentCount = await Attendance.countDocuments({
      tripId: activeTrip._id,
      status: { $in: ['PRESENT', 'LATE'] },
    });

    let markedByMe = false;
    let myRecord = null;
    if (req.user && req.user.role === 'STUDENT' && req.student) {
      myRecord = await Attendance.findOne({
        tripId: activeTrip._id,
        studentId: req.student._id,
      });
      markedByMe = !!myRecord;
    }

    res.json({
      success: true,
      active: true,
      trip: activeTrip,
      markedByMe,
      myRecord,
      stats: {
        totalStudents: totalStudents || 55,
        presentCount,
        absentCount: Math.max(0, (totalStudents || 55) - presentCount),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active trip',
      error: error.message,
    });
  }
};

export const updateTripLocation = async (req, res) => {
  try {
    const { latitude, longitude, geofenceRadius } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required.',
      });
    }

    const latNum = Number(latitude);
    const lonNum = Number(longitude);
    if (isNaN(latNum) || isNaN(lonNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude coordinates.',
      });
    }

    const updateFields = {
      currentLatitude: latNum,
      currentLongitude: lonNum,
      lastLocationUpdate: new Date(),
    };
    if (geofenceRadius && !isNaN(Number(geofenceRadius))) {
      updateFields.geofenceRadius = Number(geofenceRadius);
    }

    const activeTrip = await BusTrip.findOneAndUpdate(
      { status: 'ACTIVE' },
      { $set: updateFields },
      { new: true }
    );

    if (!activeTrip) {
      return res.status(400).json({
        success: false,
        message: 'No active bus trip found to update location.',
      });
    }

    res.json({
      success: true,
      message: 'Bus location updated successfully.',
      currentLocation: {
        latitude: activeTrip.currentLatitude,
        longitude: activeTrip.currentLongitude,
        geofenceRadius: activeTrip.geofenceRadius,
        updatedAt: activeTrip.lastLocationUpdate,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update bus location',
      error: error.message,
    });
  }
};

export const updateTripRange = async (req, res) => {
  try {
    const { geofenceRadius } = req.body;

    if (!geofenceRadius) {
      return res.status(400).json({
        success: false,
        message: 'geofenceRadius is required.',
      });
    }

    const activeTrip = await BusTrip.findOne({ status: 'ACTIVE' });
    if (!activeTrip) {
      return res.status(400).json({
        success: false,
        message: 'No active bus trip found to update geofence range.',
      });
    }

    const radius = Number(geofenceRadius);
    activeTrip.geofenceRadius = radius;
    await activeTrip.save();

    const rangeLabel = radius >= 1000 ? `${radius / 1000} km` : `${radius} meters`;

    res.json({
      success: true,
      message: `Geofence range updated to ${rangeLabel} successfully.`,
      geofenceRadius: activeTrip.geofenceRadius,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update geofence range',
      error: error.message,
    });
  }
};

export const getAllTrips = async (req, res) => {
  try {
    const trips = await BusTrip.find()
      .populate('busId', 'busNumber routeName')
      .populate('driverId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: trips.length,
      trips,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve trip history',
      error: error.message,
    });
  }
};

export const deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;

    let trip = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      trip = await BusTrip.findById(id);
    }
    if (!trip) {
      trip = await BusTrip.findOne({ tripId: id });
    }

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found.',
      });
    }

    const tripObjectId = trip._id;
    const tripIdentifier = trip.tripId;
    const tripStatus = trip.status;

    // 1. If this trip was COMPLETED, adjust students' attendedClasses and totalClasses
    if (tripStatus === 'COMPLETED') {
      const presentRecords = await Attendance.find({
        tripId: tripObjectId,
        status: { $in: ['PRESENT', 'LATE'] },
      });
      const presentStudentIds = new Set(presentRecords.map((r) => r.studentId.toString()));

      const allStudents = await Student.find({ accountStatus: 'ACTIVE' });
      for (const student of allStudents) {
        const wasPresent = presentStudentIds.has(student._id.toString());
        student.totalClasses = Math.max(0, (student.totalClasses || 0) - 1);
        if (wasPresent) {
          student.attendedClasses = Math.max(0, (student.attendedClasses || 0) - 1);
        }
        student.attendancePercentage =
          student.totalClasses > 0
            ? Math.round((student.attendedClasses / student.totalClasses) * 100)
            : 0;
        await student.save();
      }
    }

    // 2. Permanently delete all associated records to free database space
    const attendanceDeleteResult = await Attendance.deleteMany({ tripId: tripObjectId });
    const qrDeleteResult = await QRCode.deleteMany({ tripId: tripObjectId });
    await BusTrip.findByIdAndDelete(tripObjectId);

    // 3. Record in Audit Log
    await AuditLog.create({
      action: 'TRIP_ATTENDANCE_DELETED',
      performedBy: req.user._id,
      details: {
        tripId: tripIdentifier,
        deletedAttendanceCount: attendanceDeleteResult.deletedCount,
        deletedQRCodesCount: qrDeleteResult.deletedCount,
      },
      ipAddress: req.ip || '',
      status: 'SUCCESS',
    });

    res.json({
      success: true,
      message: `Trip ${tripIdentifier} and ${attendanceDeleteResult.deletedCount} attendance records permanently deleted. Database space has been freed.`,
      deletedTripId: tripObjectId,
      deletedTripIdentifier: tripIdentifier,
      freedSpace: {
        attendanceRecords: attendanceDeleteResult.deletedCount,
        qrCodes: qrDeleteResult.deletedCount,
        trips: 1,
      },
    });
  } catch (error) {
    console.error('[Delete Trip Error]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete trip and attendance records',
      error: error.message,
    });
  }
};

