import { Student } from '../models/Student.js';
import { User } from '../models/User.js';
import { Device } from '../models/Device.js';
import { Attendance } from '../models/Attendance.js';
import { AuditLog } from '../models/AuditLog.js';

export const deriveStudentUsername = (name) => {
  let cleanName = (name || '').trim();
  if (/^[A-Za-z]\.?\s+/.test(cleanName)) {
    cleanName = cleanName.replace(/^[A-Za-z]\.?\s+/, '');
  }
  cleanName = cleanName.replace(/\s+([A-Za-z]\.?)+$/g, '');
  cleanName = cleanName.replace(/(\s+[A-Za-z]\.?)+$/g, '');
  return cleanName.trim();
};

export const deriveStudentPassword = (name, department) => {
  let cleanName = (name || '').trim();
  if (/^[A-Za-z]\.?\s+/.test(cleanName)) {
    cleanName = cleanName.replace(/^[A-Za-z]\.?\s+/, '');
  }
  cleanName = cleanName.replace(/\s+([A-Za-z]\.?)+$/g, '');
  cleanName = cleanName.replace(/(\s+[A-Za-z]\.?)+$/g, '');
  cleanName = cleanName.replace(/[\s\.]+/g, '').toLowerCase();
  const cleanDept = (department || '').trim().toUpperCase();
  return cleanDept ? `${cleanName}${cleanDept}` : cleanName;
};

export const getAllStudents = async (req, res) => {
  try {
    const { search, department, year, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (department) query.department = department;
    if (year) query.year = year;
    if (status) query.accountStatus = status;

    const students = await Student.find(query)
      .populate('userId', 'username name email role rawPassword')
      .sort({ rollNumber: 1 });
    const total = await Student.countDocuments();

    // Query Device collection to guarantee 100% accurate device status
    const activeDevices = await Device.find({});
    const deviceMap = new Map();
    activeDevices.forEach((dev) => {
      if (dev.studentId) {
        deviceMap.set(dev.studentId.toString(), dev);
      }
    });

    const formattedStudents = students.map((s) => {
      const sObj = s.toObject ? s.toObject() : { ...s };
      const currentPassword = sObj.userId?.rawPassword || deriveStudentPassword(sObj.name, sObj.department);
      sObj.currentPassword = currentPassword;
      if (sObj.userId) {
        sObj.userId.rawPassword = currentPassword;
      }

      // Synchronize deviceRegistrationStatus with real Device collection
      const studentDev = deviceMap.get(s._id.toString());
      const isBound = !!studentDev;
      sObj.deviceRegistrationStatus = isBound;
      sObj.deviceId = isBound ? studentDev.deviceIdentifier : null;
      sObj.registeredDevice = isBound
        ? {
            deviceIdentifier: studentDev.deviceIdentifier,
            registeredAt: studentDev.registeredAt,
            lastUsedAt: studentDev.lastUsedAt,
            status: studentDev.status,
          }
        : null;

      // Auto-heal Student document if out of sync
      if (s.deviceRegistrationStatus !== isBound || (isBound && s.deviceId !== studentDev.deviceIdentifier)) {
        Student.findByIdAndUpdate(s._id, {
          deviceRegistrationStatus: isBound,
          deviceId: isBound ? studentDev.deviceIdentifier : null,
        }).exec().catch(() => {});
      }

      return sObj;
    });

    res.json({
      success: true,
      count: formattedStudents.length,
      total,
      students: formattedStudents,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve students',
      error: error.message,
    });
  }
};

export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('userId', 'username name email role rawPassword');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const sObj = student.toObject ? student.toObject() : { ...student };
    const currentPassword = sObj.userId?.rawPassword || deriveStudentPassword(sObj.name, sObj.department);
    sObj.currentPassword = currentPassword;
    if (sObj.userId) {
      sObj.userId.rawPassword = currentPassword;
    }

    const studentDev = await Device.findOne({ studentId: student._id });
    const isBound = !!studentDev;
    sObj.deviceRegistrationStatus = isBound;
    sObj.deviceId = isBound ? studentDev.deviceIdentifier : null;
    sObj.registeredDevice = isBound ? studentDev : null;

    const recentAttendance = await Attendance.find({ studentId: student._id })
      .populate('tripId')
      .sort({ markedAt: -1 })
      .limit(10);

    res.json({
      success: true,
      student: sObj,
      device,
      recentAttendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student details',
      error: error.message,
    });
  }
};

export const createStudent = async (req, res) => {
  try {
    const {
      name,
      rollNumber,
      email,
      phone,
      department,
      year,
      gender,
      password,
    } = req.body;

    if (!name || !rollNumber || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name, roll number, and email are required',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists',
      });
    }

    const existingStudent = await Student.findOne({ rollNumber: rollNumber.toUpperCase().trim() });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'A student with this roll number already exists',
      });
    }

    // Create User account
    const studentPassword = password || deriveStudentPassword(name, department || 'CSE');
    const user = await User.create({
      name,
      username: deriveStudentUsername(name),
      email: email.toLowerCase().trim(),
      password: studentPassword,
      rawPassword: studentPassword,
      role: 'STUDENT',
      phone: phone || '',
    });

    // Create Student record
    const student = await Student.create({
      userId: user._id,
      studentId: `STD-${rollNumber.toUpperCase().trim()}`,
      rollNumber: rollNumber.toUpperCase().trim(),
      name,
      email: email.toLowerCase().trim(),
      phone: phone || '',
      gender: gender === 'Female' ? 'Female' : 'Male',
      department: department || 'Computer Science & Engineering',
      year: year || '3rd Year',
    });

    await AuditLog.create({
      action: 'STUDENT_CREATED',
      performedBy: req.user._id,
      targetStudentId: student._id,
      details: { rollNumber: student.rollNumber, email: student.email, gender: student.gender },
      ipAddress: req.ip || '',
    });

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create student',
      error: error.message,
    });
  }
};

export const updateStudent = async (req, res) => {
  try {
    const {
      name,
      phone,
      department,
      year,
      gender,
      accountStatus,
      attendancePercentage,
      totalClasses,
      attendedClasses,
      username,
      password,
    } = req.body;

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    if (name) student.name = name;
    if (phone !== undefined) student.phone = phone;
    if (department) student.department = department;
    if (year) student.year = year;
    if (gender) student.gender = gender;
    if (accountStatus) student.accountStatus = accountStatus;
    if (attendancePercentage !== undefined && attendancePercentage !== null && !isNaN(attendancePercentage)) {
      student.attendancePercentage = Math.max(0, Math.min(100, Math.round(Number(attendancePercentage))));
    }
    if (totalClasses !== undefined && !isNaN(totalClasses)) {
      student.totalClasses = Math.max(0, Math.round(Number(totalClasses)));
    }
    if (attendedClasses !== undefined && !isNaN(attendedClasses)) {
      student.attendedClasses = Math.max(0, Math.round(Number(attendedClasses)));
    }

    await student.save();

    // Also update name/phone/credentials on User
    const user = await User.findById(student.userId);
    if (user) {
      user.name = student.name;
      user.phone = student.phone;
      user.isActive = student.accountStatus === 'ACTIVE';

      if (username && username.trim()) {
        const cleanUsername = username.trim();
        const existing = await User.findOne({
          username: { $regex: new RegExp(`^${cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          _id: { $ne: user._id },
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `Username "${cleanUsername}" is already taken by another user.`,
          });
        }
        user.username = cleanUsername;
      }

      if (password && password.trim()) {
        const cleanPassword = password.trim();
        if (cleanPassword.length < 4) {
          return res.status(400).json({
            success: false,
            message: 'Password must be at least 4 characters long.',
          });
        }
        user.password = cleanPassword;
        user.rawPassword = cleanPassword;
      }

      await user.save();
    }

    await AuditLog.create({
      action: 'STUDENT_UPDATED',
      performedBy: req.user._id,
      targetStudentId: student._id,
      details: req.body,
      ipAddress: req.ip || '',
    });

    const activePassword = user?.rawPassword || deriveStudentPassword(student.name, student.department);

    res.json({
      success: true,
      message: 'Student updated successfully',
      student,
      currentPassword: activePassword,
      user: user
        ? {
            _id: user._id,
            name: user.name,
            username: user.username,
            email: user.email,
            rawPassword: activePassword,
          }
        : undefined,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update student',
      error: error.message,
    });
  }
};

export const updateStudentCredentials = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;

    if (!username && !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a new username or new password to update.',
      });
    }

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    let user = null;
    if (student.userId) {
      user = await User.findById(student.userId);
    }
    if (!user && student.email) {
      user = await User.findOne({ email: student.email.toLowerCase() });
      if (user) {
        student.userId = user._id;
        await student.save();
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Associated user account not found for this student',
      });
    }

    const auditDetails = {
      studentId: student._id,
      rollNumber: student.rollNumber,
      name: student.name,
    };

    if (username && username.trim()) {
      const cleanUsername = username.trim();
      const existing = await User.findOne({
        username: { $regex: new RegExp(`^${cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        _id: { $ne: user._id },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Username "${cleanUsername}" is already taken by another user.`,
        });
      }
      user.username = cleanUsername;
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
      user.password = cleanPassword; // Mongoose pre('save') hashes password
      user.rawPassword = cleanPassword;
      auditDetails.passwordChanged = true;
    }

    await user.save();

    await AuditLog.create({
      action: 'STUDENT_CREDENTIALS_UPDATED',
      performedBy: req.user._id,
      targetStudentId: student._id,
      details: auditDetails,
      ipAddress: req.ip || '',
      status: 'SUCCESS',
    });

    const activePassword = user.rawPassword || deriveStudentPassword(student.name, student.department);

    res.json({
      success: true,
      message: `Credentials updated successfully for ${student.name}.`,
      currentPassword: activePassword,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        rawPassword: activePassword,
      },
    });
  } catch (error) {
    console.error('[Update Student Credentials Error]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update student credentials',
      error: error.message,
    });
  }
};

export const updateStudentAttendancePercentage = async (req, res) => {
  try {
    const { attendancePercentage } = req.body;

    if (attendancePercentage === undefined || attendancePercentage === null || isNaN(attendancePercentage)) {
      return res.status(400).json({
        success: false,
        message: 'A valid attendance percentage (0 to 100) is required.',
      });
    }

    const pct = Math.max(0, Math.min(100, Math.round(Number(attendancePercentage))));

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const oldPercentage = student.attendancePercentage;
    student.attendancePercentage = pct;
    await student.save();

    await AuditLog.create({
      action: 'STUDENT_ATTENDANCE_PERCENTAGE_OVERRIDDEN',
      performedBy: req.user._id,
      targetStudentId: student._id,
      details: {
        rollNumber: student.rollNumber,
        oldPercentage,
        newPercentage: pct,
      },
      ipAddress: req.ip || '',
    });

    res.json({
      success: true,
      message: `Attendance percentage for ${student.name} updated to ${pct}%.`,
      student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update attendance percentage',
      error: error.message,
    });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const studentDbId = student._id;
    const userId = student.userId;
    const rollNumber = student.rollNumber;
    const studentName = student.name;

    // 1. Delete associated Attendance records from database
    const attendanceResult = await Attendance.deleteMany({ studentId: studentDbId });

    // 2. Delete associated Device records from database
    const deviceResult = await Device.deleteMany({ studentId: studentDbId });

    // 3. Delete associated User auth record from database
    let userDeleted = false;
    if (userId) {
      await User.findByIdAndDelete(userId);
      userDeleted = true;
    } else if (student.email) {
      await User.deleteOne({ email: student.email.toLowerCase().trim() });
      userDeleted = true;
    }

    // 4. Delete the Student profile record from database
    await Student.findByIdAndDelete(studentDbId);

    // 5. Create audit log
    await AuditLog.create({
      action: 'STUDENT_DELETED',
      performedBy: req.user._id,
      targetStudentId: studentDbId,
      details: {
        rollNumber,
        name: studentName,
        deletedUserId: userId,
        attendanceDeletedCount: attendanceResult.deletedCount || 0,
        devicesDeletedCount: deviceResult.deletedCount || 0,
        userDeleted,
      },
      ipAddress: req.ip || '',
      status: 'SUCCESS',
    });

    res.json({
      success: true,
      message: `Student ${studentName} (${rollNumber}) and all associated records (User account, device bindings, attendance logs) have been permanently deleted from the database.`,
      deletedStudent: {
        _id: studentDbId,
        rollNumber,
        name: studentName,
      },
    });
  } catch (error) {
    console.error('[Delete Student Error]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete student from database',
      error: error.message,
    });
  }
};

/**
 * Bulk import or update students so the user can feed their 55 students data
 */
export const importStudents = async (req, res) => {
  try {
    const { students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid array of student records.',
      });
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of students) {
      const roll = (item.rollNumber || item.RollNumber || item['Roll No'] || '').trim().toUpperCase();
      const name = (item.name || item.Name || '').trim();
      const email = (item.email || item.Email || '').trim().toLowerCase();
      const rawGender = (item.gender || item.Gender || 'Male').trim();
      const gender = rawGender.toLowerCase().startsWith('f') || rawGender.toLowerCase().includes('girl') ? 'Female' : 'Male';
      const department = (item.department || item.Department || 'Computer Science & Engineering').trim();
      const year = (item.year || item.Year || '3rd Year').trim();
      const phone = (item.phone || item.Phone || '').trim();

      if (!roll || !name) continue;

      const fallbackEmail = email || `${roll.toLowerCase()}@college.edu`;

      // Check if student already exists
      let student = await Student.findOne({ rollNumber: roll });

      if (student) {
        student.name = name;
        student.gender = gender;
        student.department = department;
        student.year = year;
        if (phone) student.phone = phone;
        await student.save();

        await User.findByIdAndUpdate(student.userId, {
          name,
          phone,
        });

        updatedCount++;
      } else {
        // Create new user & student
        let user = await User.findOne({ email: fallbackEmail });
        if (!user) {
          const studentPassword = item.password || deriveStudentPassword(name, department);
          user = await User.create({
            name,
            username: deriveStudentUsername(name),
            email: fallbackEmail,
            password: studentPassword,
            rawPassword: studentPassword,
            role: 'STUDENT',
            phone,
            isActive: true,
          });
        }

        student = await Student.create({
          userId: user._id,
          studentId: `STD-${roll}`,
          rollNumber: roll,
          name,
          email: fallbackEmail,
          phone,
          gender,
          department,
          year,
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
        });

        createdCount++;
      }
    }

    await AuditLog.create({
      action: 'BULK_STUDENTS_IMPORTED',
      performedBy: req.user._id,
      details: { createdCount, updatedCount, totalProcessed: students.length },
      ipAddress: req.ip || '',
    });

    res.json({
      success: true,
      message: `Bulk import completed: ${createdCount} created, ${updatedCount} updated.`,
      createdCount,
      updatedCount,
      totalCount: await Student.countDocuments(),
    });
  } catch (error) {
    console.error('[Import Students Error]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import student data',
      error: error.message,
    });
  }
};

/**
 * Downloads a sample CSV template for 55 students
 */
export const getStudentTemplate = (req, res) => {
  const csvHeaders = 'Roll Number,Full Name,Gender (Male/Female),College Email,Phone Number,Department,Academic Year\n';
  const sampleRows = [
    '23CS001,Aarav Sharma,Male,student01@college.edu,+91 9876543201,Computer Science & Engineering,3rd Year',
    '23CS002,Aditi Rao,Female,student02@college.edu,+91 9876543202,Information Technology,3rd Year',
    '23CS003,Rohan Gupta,Male,student03@college.edu,+91 9876543203,Electronics & Communication,3rd Year',
    '23CS004,Ananya Iyer,Female,student04@college.edu,+91 9876543204,Computer Science & Engineering,3rd Year',
  ].join('\n');

  res.header('Content-Type', 'text/csv');
  res.attachment('students_import_template_55.csv');
  return res.send(csvHeaders + sampleRows);
};

/**
 * Automatically update current GPS location for student upon login / dashboard access
 */
export const updateStudentLocation = async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const latNum = Number(latitude);
    const lonNum = Number(longitude);
    if (isNaN(latNum) || isNaN(lonNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude coordinates',
      });
    }

    const student = req.student || (await Student.findOne({ userId: req.user._id }));
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    const accuracyVal = accuracy !== undefined && accuracy !== null && !isNaN(Number(accuracy)) ? Number(accuracy) : null;
    const now = new Date();

    await Student.updateOne(
      { _id: student._id },
      {
        $set: {
          lastLatitude: latNum,
          lastLongitude: lonNum,
          lastGpsAccuracy: accuracyVal,
          lastLocationUpdate: now,
        },
      }
    );

    res.json({
      success: true,
      message: 'Student GPS location updated successfully',
      location: {
        latitude: latNum,
        longitude: lonNum,
        accuracy: accuracyVal,
        updatedAt: now,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update student GPS location',
      error: error.message,
    });
  }
};

export const clearAllAttendancePercentages = async (req, res) => {
  try {
    const result = await Student.updateMany({}, {
      $set: {
        attendancePercentage: 0,
        attendedClasses: 0,
        totalClasses: 0,
      },
    });

    await AuditLog.create({
      action: 'ALL_ATTENDANCE_PERCENTAGES_CLEARED',
      performedBy: req.user._id,
      details: {
        modifiedCount: result.modifiedCount ?? result.nModified ?? 0,
      },
      ipAddress: req.ip || '',
      status: 'SUCCESS',
    });

    res.json({
      success: true,
      message: `Successfully cleared attendance percentage to 0% for all students.`,
      clearedCount: result.modifiedCount ?? result.nModified ?? 0,
    });
  } catch (error) {
    console.error('[Clear All Attendance Percentages Error]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear attendance percentages for all students',
      error: error.message,
    });
  }
};
