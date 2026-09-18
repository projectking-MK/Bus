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

    const students = await Student.find(query).sort({ rollNumber: 1 });
    const total = await Student.countDocuments();

    res.json({
      success: true,
      count: students.length,
      total,
      students,
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
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const device = await Device.findOne({ studentId: student._id });
    const recentAttendance = await Attendance.find({ studentId: student._id })
      .populate('tripId')
      .sort({ markedAt: -1 })
      .limit(10);

    res.json({
      success: true,
      student,
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
    const { name, phone, department, year, gender, accountStatus, attendancePercentage, totalClasses, attendedClasses } = req.body;

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

    // Also update name/phone on User
    await User.findByIdAndUpdate(student.userId, {
      name: student.name,
      phone: student.phone,
      isActive: student.accountStatus === 'ACTIVE',
    });

    await AuditLog.create({
      action: 'STUDENT_UPDATED',
      performedBy: req.user._id,
      targetStudentId: student._id,
      details: req.body,
      ipAddress: req.ip || '',
    });

    res.json({
      success: true,
      message: 'Student updated successfully',
      student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update student',
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
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Clean up device and user
    await Device.deleteMany({ studentId: student._id });
    await User.findByIdAndDelete(student.userId);
    await Student.findByIdAndDelete(student._id);

    await AuditLog.create({
      action: 'STUDENT_DELETED',
      performedBy: req.user._id,
      details: { rollNumber: student.rollNumber, email: student.email },
      ipAddress: req.ip || '',
    });

    res.json({
      success: true,
      message: 'Student and credentials deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete student',
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
