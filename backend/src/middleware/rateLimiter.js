import rateLimit from 'express-rate-limit';

// Rate limit for authentication attempts - optimized for 55+ simultaneous student logins on shared college Wi-Fi / NAT networks
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2500, // High capacity to comfortably support 55+ simultaneous logins without false lockouts
  skipSuccessfulRequests: true, // Successful logins are never penalized or counted toward rate limits
  keyGenerator: (req) => {
    // Key by IP + normalized credential identifier so failed attempts on one account never block other students on the same Wi-Fi
    const identifier = (
      req.body?.identifier ||
      req.body?.email ||
      req.body?.rollNumber ||
      req.body?.username ||
      ''
    )
      .toLowerCase()
      .trim();
    return identifier ? `${req.ip}_${identifier}` : req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many failed login attempts for this account. Please verify credentials and try again.',
  },
});

// Rate limit for attendance scanning - keyed by student ID or IP, allowing 55+ students to submit concurrently
export const attendanceLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // Max 120 attempts per minute per student
  keyGenerator: (req) => (req.user && req.user._id ? req.user._id.toString() : req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attendance submissions in a short period. Please wait a moment.',
  },
});

