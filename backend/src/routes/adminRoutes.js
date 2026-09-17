import express from 'express';
import {
  getDashboardSummary,
  getAttendanceLogs,
  exportAttendanceCSV,
  exportAttendanceExcel,
  exportStudentCredentials,
  getAuditLogs,
  updateGeofenceSettings,
  getBusSettings,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('ADMIN'));

router.get('/dashboard', getDashboardSummary);
router.get('/attendance', getAttendanceLogs);
router.get('/export', exportAttendanceCSV);
router.get('/export-excel', exportAttendanceExcel);
router.get('/export-credentials', exportStudentCredentials);
router.get('/audit-logs', getAuditLogs);
router.get('/settings', getBusSettings);
router.put('/settings', updateGeofenceSettings);

export default router;
