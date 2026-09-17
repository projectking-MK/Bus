import express from 'express';
import {
  startTrip,
  stopTrip,
  getActiveTrip,
  updateTripLocation,
  updateTripRange,
  getAllTrips,
  deleteTrip,
} from '../controllers/tripController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/active', getActiveTrip);
router.post('/start', authorize('ADMIN', 'DRIVER'), startTrip);
router.post('/stop', authorize('ADMIN', 'DRIVER'), stopTrip);
router.post('/location', authorize('ADMIN', 'DRIVER'), updateTripLocation);
router.patch('/range', authorize('ADMIN', 'DRIVER'), updateTripRange);
router.post('/range', authorize('ADMIN', 'DRIVER'), updateTripRange);
router.get('/', authorize('ADMIN'), getAllTrips);
router.delete('/:id', authorize('ADMIN'), deleteTrip);

export default router;
