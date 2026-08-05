import Payment from '../../models/Payment.js';
import Booking from '../../models/Booking.js';
import { recalcBookingTotals } from '../../utils/paymentTotals.js';

// ─── POST /payments ───────────────────────────────────────────────────────────
export const createPayment = async (req, res) => {
  try {
    const {
      booking: bookingId,
      amount,
      paymentType,
      paymentMethod,
      referenceNumber,
      remarks,
      paymentDate,
    } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (!booking.isActive || booking.bookingStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot add payment to a cancelled booking' });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    const payment = await Payment.create({
      booking: bookingId,
      customer: booking.customer,
      project: booking.project,
      plot: booking.plot,
      amount: parsedAmount,
      paymentType,
      paymentMethod,
      referenceNumber,
      remarks,
      collectedBy: req.user._id,
      transactionStatus: 'success',
      paidAt: paymentDate ? new Date(paymentDate) : new Date(),
    });

    const updatedBooking = await recalcBookingTotals(bookingId);

    if (updatedBooking && updatedBooking.paymentStatus === 'fully_paid') {
      updatedBooking.bookingStatus = 'completed';
      await updatedBooking.save();
    }

    const populatedPayment = await Payment.findById(payment._id)
      .populate('collectedBy', 'name email')
      .populate('booking', 'bookingId paidAmount remainingAmount paymentStatus bookingStatus');

    res.status(201).json({
      success: true,
      data: populatedPayment,
      bookingSummary: {
        paidAmount: updatedBooking?.paidAmount,
        remainingAmount: updatedBooking?.remainingAmount,
        paymentStatus: updatedBooking?.paymentStatus,
        progressPercent: updatedBooking?.totalAmount > 0
          ? Math.round((updatedBooking.paidAmount / updatedBooking.totalAmount) * 100)
          : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PATCH /payments/:id/cancel ──────────────────────────────────────────────
export const cancelPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    if (payment.transactionStatus !== 'success') {
      return res.status(400).json({
        success: false,
        message: `Payment cannot be cancelled — current status: ${payment.transactionStatus}`,
      });
    }

    const { cancellationReason } = req.body;
    if (!cancellationReason || !cancellationReason.trim()) {
      return res.status(400).json({ success: false, message: 'Cancellation reason is required' });
    }

    payment.transactionStatus = 'cancelled';
    payment.isActive = false;
    payment.cancelledAt = new Date();
    payment.cancelledBy = req.user._id;
    payment.cancellationReason = cancellationReason.trim();
    await payment.save();

    const updatedBooking = await recalcBookingTotals(payment.booking);

    res.status(200).json({
      success: true,
      message: 'Payment cancelled successfully',
      data: payment,
      bookingSummary: {
        paidAmount: updatedBooking?.paidAmount,
        remainingAmount: updatedBooking?.remainingAmount,
        paymentStatus: updatedBooking?.paymentStatus,
        progressPercent: updatedBooking?.totalAmount > 0
          ? Math.round((updatedBooking.paidAmount / updatedBooking.totalAmount) * 100)
          : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PATCH /payments/:id/refund ──────────────────────────────────────────────
export const refundPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    if (payment.transactionStatus !== 'success') {
      return res.status(400).json({
        success: false,
        message: `Only successful payments can be refunded — current status: ${payment.transactionStatus}`,
      });
    }

    const { cancellationReason } = req.body;
    if (!cancellationReason || !cancellationReason.trim()) {
      return res.status(400).json({ success: false, message: 'Refund reason is required' });
    }

    payment.transactionStatus = 'refunded';
    payment.isActive = false;
    payment.cancelledAt = new Date();
    payment.cancelledBy = req.user._id;
    payment.cancellationReason = cancellationReason.trim();
    await payment.save();

    await Payment.create({
      booking: payment.booking,
      customer: payment.customer,
      project: payment.project,
      plot: payment.plot,
      amount: payment.amount,
      paymentType: 'refund',
      paymentMethod: payment.paymentMethod,
      referenceNumber: `REFUND-${payment.paymentId}`,
      remarks: `Refund for ${payment.paymentId}: ${cancellationReason}`,
      collectedBy: req.user._id,
      transactionStatus: 'refunded',
      isActive: false,
      paidAt: new Date(),
    });

    const updatedBooking = await recalcBookingTotals(payment.booking);

    res.status(200).json({
      success: true,
      message: 'Payment refunded successfully',
      data: payment,
      bookingSummary: {
        paidAmount: updatedBooking?.paidAmount,
        remainingAmount: updatedBooking?.remainingAmount,
        paymentStatus: updatedBooking?.paymentStatus,
        progressPercent: updatedBooking?.totalAmount > 0
          ? Math.round((updatedBooking.paidAmount / updatedBooking.totalAmount) * 100)
          : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE /payments/:id — BLOCKED ──────────────────────────────────────────
export const deletePaymentBlocked = async (req, res) => {
  res.status(405).json({
    success: false,
    message: 'Payments cannot be permanently deleted. Use Cancel or Refund instead.',
  });
};
