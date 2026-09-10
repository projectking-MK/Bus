import express from 'express';
import {
  startTrip,
  stopTrip,
  getActiveTrip,
  updateTripLocation,
  getAllTrips,
} from '../controllers/tripController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/active', getActiveTrip);
router.post('/start', authorize('ADMIN', 'DRIVER'), startTrip);
router.post('/stop', authorize('ADMIN', 'DRIVER'), stopTrip);
router.post('/location', authorize('ADMIN', 'DRIVER'), updateTripLocation);
router.get('/', authorize('ADMIN'), getAllTrips);

export default router;
