import express from 'express';
import {
  registerDevice,
  resetDevice,
  getMyDevice,
} from '../controllers/deviceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/register', authorize('STUDENT'), registerDevice);
router.get('/my', authorize('STUDENT'), getMyDevice);
router.post('/reset/:studentId', authorize('ADMIN'), resetDevice);

export default router;
