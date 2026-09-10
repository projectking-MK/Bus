import { Student } from '../models/Student.js';
import { User } from '../models/User.js';
import { Device } from '../models/Device.js';
import { Attendance } from '../models/Attendance.js';
import { AuditLog } from '../models/AuditLog.js';

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
    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password: password || 'Student@123',
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
      department: department || 'Computer Science & Engineering',
      year: year || '3rd Year',
    });

    await AuditLog.create({
      action: 'STUDENT_CREATED',
      performedBy: req.user._id,
      targetStudentId: student._id,
      details: { rollNumber: student.rollNumber, email: student.email },
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
    const { name, phone, department, year, accountStatus } = req.body;

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
    if (accountStatus) student.accountStatus = accountStatus;

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
