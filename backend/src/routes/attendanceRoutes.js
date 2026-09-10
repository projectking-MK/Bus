import express from 'express';
import {
  markAttendance,
  getMyAttendance,
  getTodayAttendance,
  getActiveTripAttendance,
} from '../controllers/attendanceController.js';
import { protect, authorize } from '../middleware/auth.js';
import { attendanceLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(protect);

router.post('/mark', authorize('STUDENT'), attendanceLimiter, markAttendance);
router.get('/my', authorize('STUDENT'), getMyAttendance);
router.get('/today', getTodayAttendance);
router.get('/active-trip', authorize('ADMIN', 'DRIVER'), getActiveTripAttendance);

export default router;
