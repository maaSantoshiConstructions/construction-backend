import express from 'express';
import {
  getBookings,
  getBooking,
  getBookingDetails,
  getBookingPaymentSummary,
  createBooking,
  updateBooking,
  updatePaymentPlan,
  cancelBooking,
  getMyBookings,
  getBookingStats,
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Customer-scoped
router.get('/my-bookings', protect, getMyBookings);

// Admin / staff routes
router.get('/', protect, authorize('super_admin', 'company_admin', 'sales_executive'), getBookings);
router.get('/stats', protect, authorize('super_admin', 'company_admin'), getBookingStats);
router.post('/', protect, createBooking);

// Single booking — detail & summary
router.get('/:id', protect, getBooking);
router.get('/:id/details', protect, getBookingDetails);
router.get('/:id/payment-summary', protect, getBookingPaymentSummary);

// Mutations
router.put('/:id', protect, authorize('super_admin', 'company_admin'), updateBooking);
router.put('/:id/cancel', protect, authorize('super_admin', 'company_admin', 'customer'), cancelBooking);

// Super Admin only — privileged payment plan override
router.patch('/:id/payment-plan', protect, authorize('super_admin'), updatePaymentPlan);

export default router;
