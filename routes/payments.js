import express from 'express';
import {
  getPayments,
  getPayment,
  createPayment,
  getBookingPayments,
  getMyPayments,
  downloadReceipt,
  downloadInvoice,
  cancelPayment,
  refundPayment,
  deletePaymentBlocked,
  getPaymentStats,
} from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Customer-scoped
router.get('/my-payments', protect, getMyPayments);

// Admin routes
router.get('/', protect, authorize('super_admin', 'company_admin', 'sales_executive'), getPayments);
router.get('/stats', protect, authorize('super_admin', 'company_admin'), getPaymentStats);

// Payments by booking
router.get('/booking/:bookingId', protect, getBookingPayments);

// Single payment
router.get('/:id', protect, getPayment);
router.get('/:id/receipt', protect, downloadReceipt);
router.get('/:id/invoice', protect, downloadInvoice); // backward compat alias

// Create payment — supports optional receipt file upload
router.post(
  '/',
  protect,
  authorize('super_admin', 'company_admin', 'sales_executive'),
  upload.single('receipt'),
  createPayment
);

// Soft cancel / refund — no permanent deletion
router.patch('/:id/cancel', protect, authorize('super_admin', 'company_admin'), cancelPayment);
router.patch('/:id/refund', protect, authorize('super_admin', 'company_admin'), refundPayment);

// Permanently blocked — returns 405
router.delete('/:id', protect, deletePaymentBlocked);

export default router;
