import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Student } from '../models/Student.js';
import { BusTrip } from '../models/BusTrip.js';
import { AuditLog } from '../models/AuditLog.js';

const generateToken = (id, role, email, authenticatedTripId = null) => {
  return jwt.sign(
    { id, role, email, authenticatedTripId },
    process.env.JWT_SECRET || 'default_fallback_secret',
    { expiresIn: role === 'DRIVER' ? '365d' : '7d' }
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
    const isAnand = identifier.toLowerCase() === 'anand';

    // 1. Parallelize direct user lookup and student lookup to eliminate sequential DB roundtrips
    const [directUsers, matchedStudents] = await Promise.all([
      User.find({
        $or: [
          { email: identifier.toLowerCase() },
          { username: new RegExp(`^${escapedIdentifier}$`, 'i') },
          { name: new RegExp(`^${escapedIdentifier}$`, 'i') },
          ...(isAnand ? [{ role: 'DRIVER' }] : []),
        ],
      }),
      Student.find({
        $or: [
          { rollNumber: identifier.toUpperCase() },
          { studentId: identifier.toUpperCase() },
          { name: new RegExp(`^${escapedIdentifier}$`, 'i') },
        ],
      }).select('userId').lean(),
    ]);

    let candidateUsers = directUsers;
    if (candidateUsers.length === 0 && matchedStudents.length > 0) {
      candidateUsers = await User.find({
        _id: { $in: matchedStudents.map((s) => s.userId) },
      });
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

    // Ensure admin and driver names are updated asynchronously if needed
    if (user.role === 'ADMIN' && user.name !== 'R. Kowshiek IT') {
      user.name = 'R. Kowshiek IT';
      User.updateOne({ _id: user._id }, { name: 'R. Kowshiek IT' }).catch(() => {});
    }
    if (user.role === 'DRIVER' && user.name !== 'Anand') {
      user.name = 'Anand';
      User.updateOne({ _id: user._id }, { name: 'Anand' }).catch(() => {});
    }

    // Bind student login to current active bus trip if one is running
    const activeTrip = await BusTrip.findOne({ status: 'ACTIVE' }).select('_id sessionName').lean();
    const authenticatedTripId = (user.role === 'STUDENT' && activeTrip) ? activeTrip._id.toString() : null;

    const token = generateToken(user._id, user.role, user.email, authenticatedTripId);

    let studentData = null;
    if (user.role === 'STUDENT') {
      if (activeTrip) {
        studentData = await Student.findOneAndUpdate(
          { userId: user._id },
          { $set: { lastLoginTripId: activeTrip._id } },
          { new: true }
        );
      } else {
        studentData = await Student.findOne({ userId: user._id });
      }
    }

    // Non-blocking AuditLog recording so HTTP response is sent instantly
    AuditLog.create({
      action: 'USER_LOGIN',
      performedBy: user._id,
      targetStudentId: studentData ? studentData._id : null,
      details: { role: user.role, email: user.email, authenticatedTripId },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      status: 'SUCCESS',
    }).catch((err) => console.warn('[Login Audit Notice]', err.message));

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.role === 'ADMIN' ? 'R. Kowshiek IT' : user.role === 'DRIVER' ? 'Anand' : user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        phone: user.phone,
        authenticatedTripId,
      },
      student: studentData,
      activeTrip: activeTrip
        ? {
            id: activeTrip._id,
            tripId: activeTrip.tripId,
            sessionName: activeTrip.sessionName,
            status: activeTrip.status,
          }
        : null,
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
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'ADMIN' && user.name !== 'R. Kowshiek IT') {
      user.name = 'R. Kowshiek IT';
      await User.findByIdAndUpdate(user._id, { name: 'R. Kowshiek IT' });
    }

    if (user.role === 'DRIVER' && user.name !== 'Anand') {
      user.name = 'Anand';
      await User.findByIdAndUpdate(user._id, { name: 'Anand' });
    }

    let student = null;
    let activeTrip = null;
    let isTripAuthenticated = true;

    if (user.role === 'STUDENT') {
      student = await Student.findOne({ userId: user._id });
      activeTrip = await BusTrip.findOne({ status: 'ACTIVE' });
      if (activeTrip) {
        const studentTripId = req.user.authenticatedTripId || (student?.lastLoginTripId ? student.lastLoginTripId.toString() : null);
        isTripAuthenticated = Boolean(studentTripId && studentTripId === activeTrip._id.toString());
      }
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        phone: user.phone,
        authenticatedTripId: req.user.authenticatedTripId || null,
      },
      student,
      activeTrip: activeTrip
        ? {
            id: activeTrip._id,
            tripId: activeTrip.tripId,
            sessionName: activeTrip.sessionName,
            status: activeTrip.status,
          }
        : null,
      isTripAuthenticated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: error.message,
    });
  }
};
