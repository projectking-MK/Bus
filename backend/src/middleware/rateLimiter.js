import rateLimit from 'express-rate-limit';

// Rate limit for authentication attempts
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

// Rate limit for attendance scanning - keyed by student ID or IP, allowing 55+ students to submit concurrently
export const attendanceLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Max 60 attempts per minute per student
  keyGenerator: (req) => (req.user && req.user._id ? req.user._id.toString() : req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attendance submissions in a short period. Please wait a moment.',
  },
});
