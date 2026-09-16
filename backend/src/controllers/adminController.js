import { Student } from '../models/Student.js';
import { Attendance } from '../models/Attendance.js';
import { BusTrip } from '../models/BusTrip.js';
import { Bus } from '../models/Bus.js';
import { AuditLog } from '../models/AuditLog.js';
import { convertAttendanceToCSV } from '../utils/csvExporter.js';
import { generateAttendanceExcelWorkbook } from '../utils/excelExporter.js';

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
    }).populate('studentId', 'name rollNumber gender year department');

    const presentToday = todayAttendance.filter((a) => a.status === 'PRESENT').length;
    const lateToday = todayAttendance.filter((a) => a.status === 'LATE').length;
    const absentToday = Math.max(0, totalStudents - (presentToday + lateToday));

    // Gender breakdown for today
    const presentStudentIds = new Set();
    let boysPresent = 0;
    let girlsPresent = 0;

    todayAttendance.forEach((att) => {
      if (att.status === 'PRESENT' || att.status === 'LATE') {
        const s = att.studentId;
        if (s) {
          presentStudentIds.add(s._id.toString());
          if ((s.gender || 'Male').toLowerCase() === 'male') {
            boysPresent++;
          } else {
            girlsPresent++;
          }
        }
      }
    });

    const allStudents = await Student.find({}, 'gender attendancePercentage');
    let totalBoys = 0;
    let totalGirls = 0;
    allStudents.forEach((s) => {
      if ((s.gender || 'Male').toLowerCase() === 'male') totalBoys++;
      else totalGirls++;
    });

    const boysAbsent = Math.max(0, totalBoys - boysPresent);
    const girlsAbsent = Math.max(0, totalGirls - girlsPresent);

    // Calculate aggregate attendance percentage across students
    const avgAttendance = allStudents.length > 0
      ? Math.round(allStudents.reduce((acc, s) => acc + (s.attendancePercentage || 0), 0) / allStudents.length)
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
      .populate('studentId', 'rollNumber name department gender year')
      .populate('tripId', 'tripId')
      .sort({ markedAt: -1 })
      .limit(10);

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalBoys,
        totalGirls,
        boysPresent,
        girlsPresent,
        boysAbsent,
        girlsAbsent,
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

export const exportAttendanceExcel = async (req, res) => {
  try {
    const { date, tripId } = req.query;
    const filter = {};

    if (tripId) filter.tripId = tripId;

    let selectedDate = new Date();
    if (date) {
      selectedDate = new Date(date);
    }
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    filter.markedAt = { $gte: startOfDay, $lte: endOfDay };

    // 1. Fetch all students enrolled (55 students)
    const allStudents = await Student.find({ accountStatus: 'ACTIVE' }).sort({ rollNumber: 1 });

    // 2. Fetch marked attendance records for this period
    const attendanceRecords = await Attendance.find(filter)
      .populate('studentId', 'rollNumber name department year gender phone')
      .populate('tripId', 'tripId status startTime')
      .sort({ markedAt: -1 });

    // 3. Fetch trip/bus details
    let trip = null;
    if (tripId) {
      trip = await BusTrip.findById(tripId).populate('busId driverId');
    } else {
      trip = await BusTrip.findOne({ status: 'ACTIVE' }).populate('busId driverId');
      if (!trip) {
        trip = await BusTrip.findOne().sort({ createdAt: -1 }).populate('busId driverId');
      }
    }

    const bus = await Bus.findOne({ isActive: true });

    const tripInfo = {
      tripId: trip?.tripId || 'TRIP-DEMO',
      busNumber: trip?.busId?.busNumber || bus?.busNumber || 'BUS-01',
      routeName: trip?.busId?.routeName || bus?.routeName || 'Main Campus Route 4',
      date: selectedDate,
    };

    const workbook = await generateAttendanceExcelWorkbook({
      allStudents,
      attendanceRecords,
      trip: tripInfo,
    });

    const dateStr = selectedDate.toISOString().split('T')[0];
    const filename = `Bus_Attendance_Report_${dateStr}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('[Excel Export Error]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export attendance Excel report',
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
