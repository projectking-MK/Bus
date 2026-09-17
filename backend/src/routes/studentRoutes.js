import express from 'express';
import {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  updateStudentAttendancePercentage,
  deleteStudent,
  importStudents,
  getStudentTemplate,
  updateStudentLocation,
} from '../controllers/studentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/location', authorize('STUDENT', 'ADMIN'), updateStudentLocation);
router.get('/template', authorize('ADMIN'), getStudentTemplate);
router.post('/import', authorize('ADMIN'), importStudents);
router.get('/', authorize('ADMIN'), getAllStudents);
router.post('/', authorize('ADMIN'), createStudent);
router.get('/:id', getStudentById);
router.put('/:id', authorize('ADMIN'), updateStudent);
router.patch('/:id/attendance-percentage', authorize('ADMIN'), updateStudentAttendancePercentage);
router.delete('/:id', authorize('ADMIN'), deleteStudent);

export default router;
