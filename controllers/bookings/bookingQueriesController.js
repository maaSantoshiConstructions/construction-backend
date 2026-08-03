import Booking from '../../models/Booking.js';
import Payment from '../../models/Payment.js';
import APIFeatures from '../../utils/apiFeatures.js';
import asyncHandler from '../../middleware/asyncHandler.js';
import { sendSuccess, sendPaginated } from '../../utils/responseHandler.js';
import {
  POPULATE_CUSTOMER_BASIC,
  POPULATE_PLOT_BASIC,
  POPULATE_PLOT_FULL,
  POPULATE_PROJECT_BASIC,
  POPULATE_PROJECT_FULL,
  POPULATE_STAFF_BASIC,
} from '../../utils/populateHelper.js';

// ─── GET /bookings ────────────────────────────────────────────────────────────
export const getBookings = asyncHandler(async (req, res) => {
  const queryObj = { isActive: true };
  if (req.query.bookingStatus) queryObj.bookingStatus = req.query.bookingStatus;
  if (req.query.paymentStatus) queryObj.paymentStatus = req.query.paymentStatus;
  if (req.query.project) queryObj.project = req.query.project;

  const features = new APIFeatures(Booking.find(queryObj), req.query)
    .sort()
    .limitFields()
    .paginate();

  const bookings = await features.query
    .populate(POPULATE_CUSTOMER_BASIC)
    .populate(POPULATE_PLOT_BASIC)
    .populate(POPULATE_PROJECT_BASIC)
    .populate(POPULATE_STAFF_BASIC('salesExecutive'))
    .populate(POPULATE_STAFF_BASIC('channelPartner'));

  const total = await Booking.countDocuments(queryObj);
  sendPaginated(res, bookings, total, req.query.page, req.query.limit);
});

// ─── GET /bookings/:id ────────────────────────────────────────────────────────
export const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate(POPULATE_CUSTOMER_BASIC)
    .populate(POPULATE_PLOT_FULL)
    .populate(POPULATE_PROJECT_FULL)
    .populate(POPULATE_STAFF_BASIC('salesExecutive'))
    .populate(POPULATE_STAFF_BASIC('channelPartner'));

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }

  sendSuccess(res, booking);
});

// ─── GET /bookings/:id/details — enriched with paymentSummary + payments ─────
export const getBookingDetails = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'name email phone address city state')
      .populate('plot', 'plotNumber size facing price roadWidth corner coordinates')
      .populate('project', 'name slug type location')
      .populate('salesExecutive', 'name email phone')
      .populate('channelPartner', 'name email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const payments = await Payment.find({ booking: booking._id })
      .populate('collectedBy', 'name email')
      .sort({ createdAt: 1 });

    const progressPercent = booking.totalAmount > 0
      ? Math.min(100, Math.round((booking.paidAmount / booking.totalAmount) * 100))
      : 0;

    const paymentSummary = {
      totalAmount: booking.totalAmount,
      tokenAmount: booking.tokenAmount,
      paidAmount: booking.paidAmount,
      remainingAmount: booking.remainingAmount,
      progressPercent,
      paymentStatus: booking.paymentStatus,
      lastPaymentDate: booking.lastPaymentDate || null,
    };

    res.status(200).json({
      success: true,
      data: {
        booking,
        paymentSummary,
        payments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /bookings/:id/payment-summary ───────────────────────────────────────
export const getBookingPaymentSummary = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).select(
      'totalAmount tokenAmount paidAmount remainingAmount paymentStatus lastPaymentDate bookingStatus'
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const progressPercent = booking.totalAmount > 0
      ? Math.min(100, Math.round((booking.paidAmount / booking.totalAmount) * 100))
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totalAmount: booking.totalAmount,
        tokenAmount: booking.tokenAmount,
        paidAmount: booking.paidAmount,
        remainingAmount: booking.remainingAmount,
        progressPercent,
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.bookingStatus,
        lastPaymentDate: booking.lastPaymentDate || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /bookings/my-bookings ────────────────────────────────────────────────
export const getMyBookings = async (req, res) => {
  try {
    const features = new APIFeatures(
      Booking.find({ customer: req.user._id, isActive: true }),
      req.query
    )
      .sort()
      .limitFields()
      .paginate();

    const bookings = await features.query
      .populate('plot', 'plotNumber size facing price')
      .populate('project', 'name slug type location');

    const total = await Booking.countDocuments({ customer: req.user._id, isActive: true });

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
