import express from 'express';
import { getBookings, getBooking, createBooking, updateBooking, cancelBooking, getMyBookings, getBookingStats } from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();

router.get('/my-bookings', protect, getMyBookings);

router.get('/', protect, authorize('super_admin', 'company_admin', 'sales_executive'), getBookings);
router.get('/stats', protect, authorize('super_admin', 'company_admin'), getBookingStats);
router.get('/:id', protect, getBooking);
router.post('/', protect, createBooking);
router.put('/:id', protect, authorize('super_admin', 'company_admin'), updateBooking);
router.put('/:id/cancel', protect, authorize('super_admin', 'company_admin', 'customer'), cancelBooking);

export default router;
