import { User } from '../models/User.js';
import { Student } from '../models/Student.js';
import { Device } from '../models/Device.js';
import { Attendance } from '../models/Attendance.js';
import { BusTrip } from '../models/BusTrip.js';
import { Bus } from '../models/Bus.js';
import { AuditLog } from '../models/AuditLog.js';
import { convertAttendanceToCSV } from '../utils/csvExporter.js';
import { generateAttendanceExcelWorkbook } from '../utils/excelExporter.js';
import { generateCredentialsWorkbook, generateCredentialsPDFDoc } from '../utils/credentialsExporter.js';

export const getDashboardSummary = async (req, res) => {
  try {
    const { tripId } = req.query;

    // 1. Fetch active enrolled students (55 students)
    const allStudents = await Student.find({ accountStatus: 'ACTIVE' }).sort({ rollNumber: 1 });
    const totalStudents = allStudents.length || 55;
    const activeStudents = allStudents.length || 55;
    const registeredDevices = await Device.countDocuments({ status: 'ACTIVE' });

    let totalBoys = 0;
    let totalGirls = 0;
    allStudents.forEach((s) => {
      if ((s.gender || 'Male').toLowerCase() === 'male') totalBoys++;
      else totalGirls++;
    });

    const avgAttendance = allStudents.length > 0
      ? Math.round(allStudents.reduce((acc, s) => acc + (s.attendancePercentage || 0), 0) / allStudents.length)
      : 0;

    // 2. Fetch list of recent trips for dropdown
    const allTrips = await BusTrip.find()
      .populate('busId', 'busNumber routeName')
      .populate('driverId', 'name')
      .sort({ createdAt: -1 })
      .limit(30);

    // 3. Determine selected trip (specified tripId -> active trip -> latest trip)
    let selectedTrip = null;
    if (tripId) {
      selectedTrip = allTrips.find((t) => t._id.toString() === tripId) || (await BusTrip.findById(tripId).populate('busId driverId'));
    } else {
      selectedTrip = allTrips.find((t) => t.status === 'ACTIVE') || allTrips[0] || null;
    }

    // 4. Fetch attendance records for the selected trip
    let tripAttendance = [];
    if (selectedTrip) {
      tripAttendance = await Attendance.find({
        tripId: selectedTrip._id,
      }).populate('studentId', 'name rollNumber gender year department phone');
    }

    // 5. Compute trip-specific metrics
    const presentRecords = tripAttendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE');
    const lateRecords = tripAttendance.filter((a) => a.status === 'LATE');
    const presentStudentIds = new Set(presentRecords.map((a) => a.studentId?._id?.toString()).filter(Boolean));

    let boysPresent = 0;
    let girlsPresent = 0;
    presentRecords.forEach((att) => {
      const s = att.studentId;
      if (s) {
        if ((s.gender || 'Male').toLowerCase() === 'male') boysPresent++;
        else girlsPresent++;
      }
    });

    const presentCount = presentRecords.length;
    const lateCount = lateRecords.length;
    const absentCount = Math.max(0, totalStudents - presentCount);
    const boysAbsent = Math.max(0, totalBoys - boysPresent);
    const girlsAbsent = Math.max(0, totalGirls - girlsPresent);

    // 6. Build exact absent student list for this trip with Name, Roll, Dept & Year
    const absentStudents = allStudents
      .filter((s) => !presentStudentIds.has(s._id.toString()))
      .map((s) => ({
        id: s._id,
        name: s.name,
        rollNumber: s.rollNumber,
        gender: s.gender || 'Male',
        department: s.department,
        year: s.year,
        phone: s.phone,
      }));

    // Active trip status for top status banner
    const activeTrip = allTrips.find((t) => t.status === 'ACTIVE') || null;

    // Recent 10 scans for this trip
    const recentActivity = tripAttendance.slice(0, 10);

    res.json({
      success: true,
      selectedTrip: selectedTrip
        ? {
            id: selectedTrip._id,
            tripId: selectedTrip.tripId,
            session: selectedTrip.session || 'MORNING',
            sessionName: selectedTrip.sessionName || (selectedTrip.session === 'MORNING' ? 'Morning Trip' : 'Evening Trip'),
            status: selectedTrip.status,
            busNumber: selectedTrip.busId?.busNumber || 'BUS-09',
            routeName: selectedTrip.busId?.routeName || 'College Bus No 09',
            driverName: selectedTrip.driverId?.name || 'Anand',
            startTime: selectedTrip.startTime,
            endTime: selectedTrip.endTime,
            geofenceRadius: selectedTrip.geofenceRadius,
            currentLatitude: selectedTrip.currentLatitude,
            currentLongitude: selectedTrip.currentLongitude,
            presentCount,
            absentCount,
          }
        : null,
      allTrips: allTrips.map((t) => ({
        id: t._id,
        tripId: t.tripId,
        session: t.session || 'MORNING',
        sessionName: t.sessionName || (t.session === 'MORNING' ? 'Morning Trip' : 'Evening Trip'),
        status: t.status,
        startTime: t.startTime,
        endTime: t.endTime,
        busNumber: t.busId?.busNumber || 'BUS-09',
      })),
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
        presentCount,
        absentCount,
        lateCount,
        presentToday: presentCount,
        absentToday: absentCount,
        lateToday: lateCount,
        averageAttendancePercentage: avgAttendance,
      },
      activeTrip: activeTrip
        ? {
            id: activeTrip._id,
            tripId: activeTrip.tripId,
            session: activeTrip.session || 'MORNING',
            sessionName: activeTrip.sessionName || 'Morning Trip',
            busNumber: activeTrip.busId?.busNumber || 'BUS-09',
            routeName: activeTrip.busId?.routeName || 'College Bus No 09',
            driverName: activeTrip.driverId?.name || 'Anand',
            startTime: activeTrip.startTime,
            currentLatitude: activeTrip.currentLatitude,
            currentLongitude: activeTrip.currentLongitude,
            geofenceRadius: activeTrip.geofenceRadius,
            presentCount: activeTrip._id.toString() === selectedTrip?._id?.toString() ? presentCount : 0,
            absentCount: activeTrip._id.toString() === selectedTrip?._id?.toString() ? absentCount : totalStudents,
          }
        : null,
      absentStudents,
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
    const { search, date, status, tripId, gender } = req.query;
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
      .populate('studentId', 'rollNumber name department year phone gender')
      .populate('tripId', 'tripId status startTime')
      .sort({ markedAt: -1 });

    if (gender && gender !== 'ALL') {
      const targetGender = gender.toUpperCase() === 'GIRLS' || gender.toLowerCase() === 'female' ? 'Female' : 'Male';
      records = records.filter((r) => r.studentId?.gender === targetGender);
    }

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
    const { date, status, tripId, gender } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (tripId) filter.tripId = tripId;
    if (date) {
      const selectedDate = new Date(date);
      const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
      filter.markedAt = { $gte: startOfDay, $lte: endOfDay };
    }

    let records = await Attendance.find(filter)
      .populate('studentId', 'rollNumber name department year gender phone')
      .populate('tripId', 'tripId')
      .sort({ markedAt: -1 });

    if (gender && gender !== 'ALL') {
      const targetGender = gender.toUpperCase() === 'GIRLS' || gender.toLowerCase() === 'female' ? 'Female' : 'Male';
      records = records.filter((r) => r.studentId?.gender === targetGender);
    }

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
    let trip = null;

    if (tripId) {
      trip = await BusTrip.findById(tripId).populate('busId driverId');
    } else {
      trip = await BusTrip.findOne({ status: 'ACTIVE' }).populate('busId driverId');
      if (!trip) {
        trip = await BusTrip.findOne().sort({ createdAt: -1 }).populate('busId driverId');
      }
    }

    if (trip) {
      filter.tripId = trip._id;
      selectedDate = trip.startTime || new Date();
    } else if (date) {
      selectedDate = new Date(date);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      filter.markedAt = { $gte: startOfDay, $lte: endOfDay };
    }

    // 1. Fetch all students enrolled (55 students)
    const allStudents = await Student.find({ accountStatus: 'ACTIVE' }).sort({ rollNumber: 1 });

    // 2. Fetch marked attendance records for this period
    const attendanceRecords = await Attendance.find(filter)
      .populate('studentId', 'rollNumber name department year gender phone')
      .populate('tripId', 'tripId status startTime')
      .sort({ markedAt: -1 });

    const bus = await Bus.findOne({ isActive: true });

    const tripInfo = {
      tripId: trip?.tripId || 'TRIP-DEMO',
      sessionName: trip?.sessionName || (trip?.session === 'MORNING' ? 'Morning Trip' : 'Evening Trip'),
      busNumber: trip?.busId?.busNumber || bus?.busNumber || 'BUS-09',
      routeName: trip?.busId?.routeName || bus?.routeName || 'College Bus No 09',
      date: selectedDate,
    };

    const workbook = await generateAttendanceExcelWorkbook({
      allStudents,
      attendanceRecords,
      trip: tripInfo,
    });

    const sessionSuffix = trip?.session ? `_${trip.session}` : '';
    const dateStr = selectedDate.toISOString().split('T')[0];
    const filename = `Bus_Attendance_Report_${dateStr}${sessionSuffix}.xlsx`;

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

export const exportStudentCredentials = async (req, res) => {
  try {
    const { gender = 'ALL', format = 'xlsx' } = req.query;
    const isPDF = format.toLowerCase() === 'pdf';
    const genderTag = gender.toUpperCase();

    if (isPDF) {
      const doc = generateCredentialsPDFDoc({ gender: genderTag });
      const filename = `${genderTag === 'GIRLS' ? 'Girls' : genderTag === 'BOYS' ? 'Boys' : 'Student'}_Credentials.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      doc.pipe(res);
      doc.end();
    } else {
      const workbook = generateCredentialsWorkbook({ gender: genderTag });
      const filename = `${genderTag === 'GIRLS' ? 'Girls' : genderTag === 'BOYS' ? 'Boys' : 'Student'}_Credentials.xlsx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      await workbook.xlsx.write(res);
      res.end();
    }
  } catch (error) {
    console.error('[Export Student Credentials Error]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export student credentials',
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
        busNumber: 'BUS-09',
        routeName: 'College Bus No 09',
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

export const getStaffCredentials = async (req, res) => {
  try {
    const driver = await User.findOne({ role: 'DRIVER' }).select('-password');
    const admin = await User.findOne({ role: 'ADMIN' }).select('-password');

    res.json({
      success: true,
      driver: driver
        ? {
            _id: driver._id,
            name: driver.name,
            username: driver.username || 'driver',
            email: driver.email,
            phone: driver.phone || '',
            role: driver.role,
            currentPassword: driver.rawPassword || 'Driver@123',
          }
        : null,
      admin: admin
        ? {
            _id: admin._id,
            name: admin.name,
            username: admin.username || 'admin',
            email: admin.email,
            phone: admin.phone || '',
            role: admin.role,
            currentPassword: admin.rawPassword || 'Admin@123',
          }
        : null,
    });
  } catch (error) {
    console.error('[Get Staff Credentials Error]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff credentials',
      error: error.message,
    });
  }
};

export const updateStaffCredentials = async (req, res) => {
  try {
    const targetRole = (req.params.targetRole || req.body.targetRole || '').toUpperCase();
    const { username, password, name, phone } = req.body;

    if (!['DRIVER', 'ADMIN'].includes(targetRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target role. Must be either DRIVER or ADMIN.',
      });
    }

    if (!username && !password && !name && phone === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least a new username or password to update.',
      });
    }

    let targetUser = await User.findOne({ role: targetRole });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: `${targetRole} user account not found in database.`,
      });
    }

    const auditDetails = {
      targetRole,
      targetUserId: targetUser._id,
    };

    if (username && username.trim()) {
      const cleanUsername = username.trim();
      const existing = await User.findOne({
        username: { $regex: new RegExp(`^${cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        _id: { $ne: targetUser._id },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Username "${cleanUsername}" is already taken by another account.`,
        });
      }

      targetUser.username = cleanUsername;
      auditDetails.usernameChanged = true;
      auditDetails.newUsername = cleanUsername;
    }

    if (password && password.trim()) {
      const cleanPassword = password.trim();
      if (cleanPassword.length < 4) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 4 characters long.',
        });
      }

      targetUser.password = cleanPassword; // Mongoose pre-save hashes this with bcrypt
      targetUser.rawPassword = cleanPassword;
      auditDetails.passwordChanged = true;
    }

    if (name && name.trim()) {
      targetUser.name = name.trim();
      auditDetails.nameChanged = true;
    }

    if (phone !== undefined) {
      targetUser.phone = phone.trim();
      auditDetails.phoneChanged = true;
    }

    await targetUser.save();

    await AuditLog.create({
      action: `${targetRole}_CREDENTIALS_UPDATED`,
      performedBy: req.user._id,
      details: auditDetails,
      ipAddress: req.ip || '',
      status: 'SUCCESS',
    });

    const activePassword = targetUser.rawPassword || (targetRole === 'DRIVER' ? 'Driver@123' : 'Admin@123');

    res.json({
      success: true,
      message: `${targetRole === 'DRIVER' ? 'Driver' : 'Admin'} credentials updated successfully.`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        username: targetUser.username,
        email: targetUser.email,
        role: targetUser.role,
        phone: targetUser.phone,
        currentPassword: activePassword,
      },
    });
  } catch (error) {
    console.error('[Update Staff Credentials Error]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update credentials',
      error: error.message,
    });
  }
};

