import { Student } from '../models/Student.js';
import { Attendance } from '../models/Attendance.js';
import { BusTrip } from '../models/BusTrip.js';
import { Bus } from '../models/Bus.js';
import { AuditLog } from '../models/AuditLog.js';
import { convertAttendanceToCSV } from '../utils/csvExporter.js';

export const getDashboardSummary = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ accountStatus: 'ACTIVE' });
    const registeredDevices = await Student.countDocuments({ deviceRegistrationStatus: true });

    // Today's range
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayAttendance = await Attendance.find({
      markedAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const presentToday = todayAttendance.filter((a) => a.status === 'PRESENT').length;
    const lateToday = todayAttendance.filter((a) => a.status === 'LATE').length;
    const absentToday = Math.max(0, totalStudents - (presentToday + lateToday));

    // Calculate aggregate attendance percentage across all 68 students
    const students = await Student.find({}, 'attendancePercentage');
    const avgAttendance = students.length > 0
      ? Math.round(students.reduce((acc, s) => acc + (s.attendancePercentage || 0), 0) / students.length)
      : 0;

    // Active trip status
    const activeTrip = await BusTrip.findOne({ status: 'ACTIVE' })
      .populate('busId', 'busNumber routeName capacity defaultGeofenceRadius')
      .populate('driverId', 'name email');

    let tripPresentCount = 0;
    if (activeTrip) {
      tripPresentCount = await Attendance.countDocuments({
        tripId: activeTrip._id,
        status: { $in: ['PRESENT', 'LATE'] },
      });
    }

    // Recent 10 attendance records
    const recentActivity = await Attendance.find()
      .populate('studentId', 'rollNumber name department')
      .populate('tripId', 'tripId')
      .sort({ markedAt: -1 })
      .limit(10);

    res.json({
      success: true,
      stats: {
        totalStudents,
        activeStudents,
        registeredDevices,
        presentToday,
        absentToday,
        lateToday,
        averageAttendancePercentage: avgAttendance,
      },
      activeTrip: activeTrip
        ? {
            id: activeTrip._id,
            tripId: activeTrip.tripId,
            busNumber: activeTrip.busId?.busNumber,
            routeName: activeTrip.busId?.routeName,
            driverName: activeTrip.driverId?.name,
            startTime: activeTrip.startTime,
            currentLatitude: activeTrip.currentLatitude,
            currentLongitude: activeTrip.currentLongitude,
            geofenceRadius: activeTrip.geofenceRadius,
            presentCount: tripPresentCount,
            absentCount: Math.max(0, totalStudents - tripPresentCount),
          }
        : null,
      recentActivity,
    });
  } catch (error) {
    console.error('[Admin Dashboard Error]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin dashboard summary',
      error: error.message,
    });
  }
};

export const getAttendanceLogs = async (req, res) => {
  try {
    const { search, date, status, tripId } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (date) {
      const selectedDate = new Date(date);
      const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
      filter.markedAt = { $gte: startOfDay, $lte: endOfDay };
    }

    if (tripId) {
      filter.tripId = tripId;
    }

    let records = await Attendance.find(filter)
      .populate('studentId', 'rollNumber name department year phone')
      .populate('tripId', 'tripId status startTime')
      .sort({ markedAt: -1 });

    if (search) {
      const s = search.toLowerCase();
      records = records.filter(
        (r) =>
          r.studentId?.rollNumber?.toLowerCase().includes(s) ||
          r.studentId?.name?.toLowerCase().includes(s)
      );
    }

    res.json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance logs',
      error: error.message,
    });
  }
};

export const exportAttendanceCSV = async (req, res) => {
  try {
    const { date, status, tripId } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (tripId) filter.tripId = tripId;
    if (date) {
      const selectedDate = new Date(date);
      const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
      filter.markedAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const records = await Attendance.find(filter)
      .populate('studentId', 'rollNumber name department year')
      .populate('tripId', 'tripId')
      .sort({ markedAt: -1 });

    const csvData = convertAttendanceToCSV(records);

    res.header('Content-Type', 'text/csv');
    res.attachment(`attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csvData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export attendance CSV',
      error: error.message,
    });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('performedBy', 'name email role')
      .populate('targetStudentId', 'rollNumber name')
      .sort({ timestamp: -1 })
      .limit(50);

    res.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message,
    });
  }
};

export const updateGeofenceSettings = async (req, res) => {
  try {
    const { radius, centerLatitude, centerLongitude } = req.body;

    let bus = await Bus.findOne({ isActive: true });
    if (!bus) {
      bus = await Bus.create({
        busNumber: 'BUS-01',
        routeName: 'Campus Route 4',
        capacity: 68,
        defaultGeofenceRadius: radius || 100,
        defaultCenterLatitude: centerLatitude || 13.0827,
        defaultCenterLongitude: centerLongitude || 80.2707,
      });
    } else {
      if (radius) bus.defaultGeofenceRadius = Number(radius);
      if (centerLatitude) bus.defaultCenterLatitude = Number(centerLatitude);
      if (centerLongitude) bus.defaultCenterLongitude = Number(centerLongitude);
      await bus.save();
    }

    // Also update any active trip's radius
    await BusTrip.updateMany(
      { status: 'ACTIVE' },
      { geofenceRadius: bus.defaultGeofenceRadius }
    );

    res.json({
      success: true,
      message: 'Bus geofence settings updated successfully.',
      bus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update geofence settings',
      error: error.message,
    });
  }
};

export const getBusSettings = async (req, res) => {
  try {
    let bus = await Bus.findOne({ isActive: true });
    if (!bus) {
      bus = await Bus.findOne();
    }
    res.json({
      success: true,
      bus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bus settings',
      error: error.message,
    });
  }
};
