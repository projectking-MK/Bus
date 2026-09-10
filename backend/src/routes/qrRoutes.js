import express from 'express';
import { getCurrentQR } from '../controllers/qrController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/current', authorize('ADMIN', 'DRIVER'), getCurrentQR);

export default router;
