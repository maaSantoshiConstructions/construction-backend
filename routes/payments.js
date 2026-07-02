import express from 'express';
import { getPayments, getPayment, createPayment, getBookingPayments, getMyPayments, downloadInvoice, getPaymentStats } from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();

router.get('/my-payments', protect, getMyPayments);

router.get('/', protect, authorize('super_admin', 'company_admin'), getPayments);
router.get('/stats', protect, authorize('super_admin', 'company_admin'), getPaymentStats);
router.get('/:id', protect, getPayment);
router.get('/:id/invoice', protect, downloadInvoice);
router.get('/booking/:bookingId', protect, getBookingPayments);
router.post('/', protect, authorize('super_admin', 'company_admin', 'customer'), createPayment);

export default router;
