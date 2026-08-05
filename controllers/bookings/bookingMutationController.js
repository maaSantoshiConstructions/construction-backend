import Booking from '../../models/Booking.js';
import Plot from '../../models/Plot.js';
import Customer from '../../models/Customer.js';
import Payment from '../../models/Payment.js';

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

    if (initialPaid > 0) {
      const pMethod = paymentMethod || 'cash';
      const refNum = pMethod === 'cash' ? undefined : referenceNumber || undefined;
      const pDate = paymentDate ? new Date(paymentDate) : new Date();
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
    const ALLOWED = ['customer', 'salesExecutive', 'channelPartner', 'remarks', 'bookingStatus'];
    const updateData = {};
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    if (updateData.bookingStatus && !['active', 'completed', 'cancelled'].includes(updateData.bookingStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid bookingStatus value' });
    }

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
      { paymentPlan },
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
    await booking.save();

    res.status(200).json({ success: true, message: 'Booking cancelled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
