import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Student } from '../models/Student.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, missing or invalid token',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_fallback_secret');
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive or no longer exists',
      });
    }

    req.user = user;
    req.user.authenticatedTripId = decoded.authenticatedTripId || null;

    // If student, attach student profile
    if (user.role === 'STUDENT') {
      const student = await Student.findOne({ userId: user._id });
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Associated student record not found',
        });
      }
      if (student.accountStatus !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          message: 'Student account is suspended',
        });
      }
      req.student = student;
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session token',
      error: error.message,
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden: User role '${req.user?.role}' is not authorized for this resource`,
      });
    }
    next();
  };
};
