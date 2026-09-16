import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Student } from '../models/Student.js';
import { AuditLog } from '../models/AuditLog.js';

const generateToken = (id, role, email) => {
  return jwt.sign(
    { id, role, email },
    process.env.JWT_SECRET || 'default_fallback_secret',
    { expiresIn: '7d' }
  );
};

export const login = async (req, res) => {
  try {
    const { email, username, identifier: rawIdentifier, password } = req.body;
    const identifier = (rawIdentifier || username || email || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username/email and password',
      });
    }

    const escapedIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 1. Check direct match on email, username, or name (case-insensitive)
    let candidateUsers = await User.find({
      $or: [
        { email: identifier.toLowerCase() },
        { username: new RegExp(`^${escapedIdentifier}$`, 'i') },
        { name: new RegExp(`^${escapedIdentifier}$`, 'i') },
      ],
    });

    // 2. If not found, check Student collection by rollNumber, studentId, or student name
    if (candidateUsers.length === 0) {
      const students = await Student.find({
        $or: [
          { rollNumber: identifier.toUpperCase() },
          { studentId: identifier.toUpperCase() },
          { name: new RegExp(`^${escapedIdentifier}$`, 'i') },
        ],
      });
      if (students.length > 0) {
        candidateUsers = await User.find({
          _id: { $in: students.map((s) => s.userId) },
        });
      }
    }

    if (candidateUsers.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password.',
      });
    }

    // Authenticate candidate matching password
    let user = null;
    for (const candidate of candidateUsers) {
      const isMatch = await candidate.comparePassword(password);
      if (isMatch) {
        user = candidate;
        break;
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact the administrator.',
      });
    }

    const token = generateToken(user._id, user.role, user.email);

    let studentData = null;
    if (user.role === 'STUDENT') {
      studentData = await Student.findOne({ userId: user._id });
    }

    // Log successful login
    await AuditLog.create({
      action: 'USER_LOGIN',
      performedBy: user._id,
      targetStudentId: studentData ? studentData._id : null,
      details: { role: user.role, email: user.email },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      status: 'SUCCESS',
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
      student: studentData,
    });
  } catch (error) {
    console.error('[Login Error]', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication',
      error: error.message,
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    let student = null;

    if (user.role === 'STUDENT') {
      student = await Student.findOne({ userId: user._id });
    }

    res.json({
      success: true,
      user,
      student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: error.message,
    });
  }
};
