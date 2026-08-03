import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';

/**
 * Shared helper: recalculate booking totals from payment records
 */
export const recalcBookingTotals = async (bookingId) => {
  const payments = await Payment.find({
    booking: bookingId,
    transactionStatus: 'success',
    isActive: true,
  });

  const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const lastPayment = await Payment.findOne({
    booking: bookingId,
    transactionStatus: 'success',
    isActive: true,
  }).sort({ createdAt: -1 });

  const booking = await Booking.findById(bookingId);
  if (!booking) return null;

  booking.paidAmount = paidAmount;
  // remainingAmount and paymentStatus auto-calculated in pre-save hook
  if (lastPayment) {
    booking.lastPaymentDate = lastPayment.paidAt || lastPayment.createdAt;
  }

  await booking.save();
  return booking;
};
