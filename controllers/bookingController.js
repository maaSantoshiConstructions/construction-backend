import Booking from '../models/Booking.js';
import Plot from '../models/Plot.js';
import Customer from '../models/Customer.js';
import Payment from '../models/Payment.js';
import APIFeatures from '../utils/apiFeatures.js';

// ─── GET /bookings ────────────────────────────────────────────────────────────
export const getBookings = async (req, res) => {
  try {
    // Build base query — support filtering by bookingStatus, paymentStatus, project
    const queryObj = { isActive: true };
    if (req.query.bookingStatus) queryObj.bookingStatus = req.query.bookingStatus;
    if (req.query.paymentStatus) queryObj.paymentStatus = req.query.paymentStatus;
    if (req.query.project) queryObj.project = req.query.project;

    const features = new APIFeatures(Booking.find(queryObj), req.query)
      .sort()
      .limitFields()
      .paginate();

    const bookings = await features.query
      .populate('customer', 'name email phone')
      .populate('plot', 'plotNumber size facing')
      .populate('project', 'name slug')
      .populate('salesExecutive', 'name email')
      .populate('channelPartner', 'name email');

    const total = await Booking.countDocuments(queryObj);

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      totalPages: Math.ceil(total / (req.query.limit || 10)),
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /bookings/:id ────────────────────────────────────────────────────────
export const getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('plot', 'plotNumber size facing price coordinates')
      .populate('project', 'name slug type')
      .populate('salesExecutive', 'name email')
      .populate('channelPartner', 'name email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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

    // Fetch all payments for this booking, sorted chronologically
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

// ─── POST /bookings ───────────────────────────────────────────────────────────
export const createBooking = async (req, res) => {
  try {
    const {
      plot: plotId,
      customer,
      salesExecutive,
      channelPartner,
      tokenAmount,
      totalAmount,
      paymentPlan,
      remarks,
      paymentMethod,
      referenceNumber,
      paymentDate,
    } = req.body;

    const plot = await Plot.findById(plotId);
    if (!plot) {
      return res.status(404).json({ success: false, message: 'Plot not found' });
    }
    if (plot.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Plot is not available for booking' });
    }

    const initialPaid = tokenAmount && Number(tokenAmount) > 0 ? Number(tokenAmount) : 0;

    const booking = await Booking.create({
      customer: customer || req.user._id,
      plot: plotId,
      project: plot.project,
      salesExecutive,
      channelPartner,
      tokenAmount: initialPaid,
      totalAmount: Number(totalAmount),
      paidAmount: initialPaid,
      remainingAmount: Number(totalAmount) - initialPaid,
      paymentPlan: paymentPlan || 'full_payment',
      bookingStatus: 'active',
      remarks,
    });

    // Upsert customer record
    await Customer.findOneAndUpdate(
      { user: customer || req.user._id },
      {
        user: customer || req.user._id,
        project: plot.project,
        plot: plotId,
        booking: booking._id,
        $inc: { totalPaid: initialPaid },
      },
      { upsert: true, new: true }
    );

    // Auto-create token payment record if token amount provided
    if (initialPaid > 0) {
      const pMethod = paymentMethod || 'cash';
      const refNum = pMethod === 'cash' ? undefined : (referenceNumber || undefined);
      const pDate = paymentDate ? new Date(paymentDate) : new Date();
      const receiptUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

      await Payment.create({
        booking: booking._id,
        customer: customer || req.user._id,
        project: plot.project,
        plot: plotId,
        amount: initialPaid,
        paymentType: 'token',
        paymentMethod: pMethod,
        referenceNumber: refNum,
        transactionStatus: 'success',
        paidAt: pDate,
        receiptUrl,
        remarks: 'Token amount collected during booking registration.',
        collectedBy: req.user._id,
      });

      booking.lastPaymentDate = pDate;
      await booking.save();
    }

    const populated = await Booking.findById(booking._id)
      .populate('customer', 'name email phone')
      .populate('plot', 'plotNumber size facing')
      .populate('project', 'name slug');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /bookings/:id — whitelisted fields only ──────────────────────────────
export const updateBooking = async (req, res) => {
  try {
    // Strict whitelist — paymentPlan, paidAmount, remainingAmount, paymentStatus are NOT editable
    const ALLOWED = ['customer', 'salesExecutive', 'channelPartner', 'remarks', 'bookingStatus'];
    const updateData = {};
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    // Validate bookingStatus
    if (updateData.bookingStatus && !['active', 'completed', 'cancelled'].includes(updateData.bookingStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid bookingStatus value' });
    }

    // If cancelling via status change, also mark isActive false
    if (updateData.bookingStatus === 'cancelled') {
      updateData.isActive = false;
    }

    const booking = await Booking.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('customer', 'name email phone')
      .populate('plot', 'plotNumber size facing')
      .populate('project', 'name slug')
      .populate('salesExecutive', 'name email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PATCH /bookings/:id/payment-plan — Super Admin only ─────────────────────
export const updatePaymentPlan = async (req, res) => {
  try {
    const { paymentPlan } = req.body;
    const validPlans = ['full_payment', 'installment', 'loan'];

    if (!paymentPlan || !validPlans.includes(paymentPlan)) {
      return res.status(400).json({
        success: false,
        message: `Invalid paymentPlan. Must be one of: ${validPlans.join(', ')}`,
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        paymentPlan,
        // Log who changed it and when in remarks (audit trail without extra schema field)
      },
      { new: true, runValidators: true }
    ).populate('customer', 'name email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.status(200).json({
      success: true,
      message: `Payment plan updated to "${paymentPlan}" by Super Admin`,
      data: booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /bookings/:id/cancel ─────────────────────────────────────────────────
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.bookingStatus = 'cancelled';
    booking.isActive = false;
    await booking.save(); // post-save hook will set plot → available

    res.status(200).json({ success: true, message: 'Booking cancelled successfully' });
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

// ─── GET /bookings/stats ──────────────────────────────────────────────────────
export const getBookingStats = async (req, res) => {
  try {
    const byBookingStatus = await Booking.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$bookingStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' },
        },
      },
      { $project: { bookingStatus: '$_id', count: 1, totalAmount: 1, paidAmount: 1, _id: 0 } },
    ]);

    const byPaymentStatus = await Booking.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          paidAmount: { $sum: '$paidAmount' },
        },
      },
      { $project: { paymentStatus: '$_id', count: 1, paidAmount: 1, _id: 0 } },
    ]);

    const totalBookings = await Booking.countDocuments({ isActive: true });
    const revenueAgg = await Booking.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalCollected: { $sum: '$paidAmount' },
          totalOutstanding: { $sum: '$remainingAmount' },
        },
      },
    ]);

    const revenue = revenueAgg[0] || { totalRevenue: 0, totalCollected: 0, totalOutstanding: 0 };

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        byBookingStatus,
        byPaymentStatus,
        ...revenue,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
