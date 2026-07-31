import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import PDFDocument from 'pdfkit';
import APIFeatures from '../utils/apiFeatures.js';

// ─── Shared helper: recalculate booking totals from payment records ───────────
const recalcBookingTotals = async (bookingId) => {
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

// ─── GET /payments ────────────────────────────────────────────────────────────
export const getPayments = async (req, res) => {
  try {
    // Build filter
    const queryObj = {};
    if (req.query.project) queryObj.project = req.query.project;
    if (req.query.paymentType) queryObj.paymentType = req.query.paymentType;
    if (req.query.paymentMethod) queryObj.paymentMethod = req.query.paymentMethod;
    if (req.query.transactionStatus) queryObj.transactionStatus = req.query.transactionStatus;
    if (req.query.customer) queryObj.customer = req.query.customer;
    if (req.query.dateFrom || req.query.dateTo) {
      queryObj.createdAt = {};
      if (req.query.dateFrom) queryObj.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) queryObj.createdAt.$lte = new Date(req.query.dateTo);
    }

    const features = new APIFeatures(Payment.find(queryObj), req.query)
      .sort()
      .limitFields()
      .paginate();

    const payments = await features.query
      .populate('booking', 'bookingId totalAmount paidAmount remainingAmount bookingStatus')
      .populate('customer', 'name email phone')
      .populate('project', 'name')
      .populate('plot', 'plotNumber')
      .populate('collectedBy', 'name email')
      .populate('cancelledBy', 'name');

    const total = await Payment.countDocuments(queryObj);

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      totalPages: Math.ceil(total / (req.query.limit || 10)),
      data: payments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /payments/:id ────────────────────────────────────────────────────────
export const getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('booking', 'bookingId totalAmount paidAmount remainingAmount bookingStatus paymentStatus')
      .populate('customer', 'name email phone')
      .populate('project', 'name')
      .populate('plot', 'plotNumber')
      .populate('collectedBy', 'name email')
      .populate('cancelledBy', 'name');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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

    // Handle receipt upload if file provided
    const receiptUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

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
      receiptUrl,
    });

    // Auto-update booking totals
    const updatedBooking = await recalcBookingTotals(bookingId);

    // If fully paid, optionally mark booking as completed
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

// ─── GET /payments/booking/:bookingId — all payments for a booking ────────────
export const getBookingPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ booking: req.params.bookingId })
      .populate('collectedBy', 'name email')
      .populate('cancelledBy', 'name')
      .sort({ createdAt: 1 }); // ascending for running balance calculation

    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /payments/my-payments ────────────────────────────────────────────────
export const getMyPayments = async (req, res) => {
  try {
    const features = new APIFeatures(
      Payment.find({ customer: req.user._id }),
      req.query
    )
      .sort()
      .limitFields()
      .paginate();

    const payments = await features.query
      .populate('booking', 'bookingId totalAmount paidAmount')
      .populate('project', 'name')
      .populate('plot', 'plotNumber');

    const total = await Payment.countDocuments({ customer: req.user._id });

    res.status(200).json({ success: true, count: payments.length, total, data: payments });
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

    // Soft-cancel
    payment.transactionStatus = 'cancelled';
    payment.isActive = false;
    payment.cancelledAt = new Date();
    payment.cancelledBy = req.user._id;
    payment.cancellationReason = cancellationReason.trim();
    await payment.save();

    // Recalculate booking totals (only successful payments count)
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

    // Mark original as refunded
    payment.transactionStatus = 'refunded';
    payment.isActive = false;
    payment.cancelledAt = new Date();
    payment.cancelledBy = req.user._id;
    payment.cancellationReason = cancellationReason.trim();
    await payment.save();

    // Create a visible refund record
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
      isActive: false, // refund record visible but doesn't count in paidAmount
      paidAt: new Date(),
    });

    // Recalculate booking totals
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

// ─── GET /payments/:id/receipt — PDF receipt ──────────────────────────────────
export const downloadReceipt = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('booking', 'bookingId totalAmount paidAmount remainingAmount')
      .populate('customer', 'name email phone')
      .populate('project', 'name')
      .populate('plot', 'plotNumber')
      .populate('collectedBy', 'name');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${payment.paymentId || payment._id}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold').text('Jai Santoshi Maa Infrastructure Pvt. Ltd.', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Building Dreams, Delivering Excellence', { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Receipt details
    doc.fontSize(10).font('Helvetica-Bold').text(`Payment ID: ${payment.paymentId || payment._id.toString().slice(-8).toUpperCase()}`);
    doc.font('Helvetica').text(`Date: ${(payment.paidAt || payment.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`);
    doc.text(`Booking ID: ${payment.booking?.bookingId || '-'}`);
    doc.text(`Payment Type: ${payment.paymentType?.replace(/_/g, ' ').toUpperCase()}`);
    doc.text(`Payment Mode: ${payment.paymentMethod?.replace(/_/g, ' ').toUpperCase()}`);
    if (payment.referenceNumber) doc.text(`Reference No: ${payment.referenceNumber}`);
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Customer
    doc.font('Helvetica-Bold').text('Customer:');
    doc.font('Helvetica').text(`Name: ${payment.customer?.name || '-'}`);
    doc.text(`Email: ${payment.customer?.email || '-'}`);
    if (payment.customer?.phone) doc.text(`Phone: ${payment.customer.phone}`);
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Plot / Project
    if (payment.plot?.plotNumber || payment.project?.name) {
      doc.font('Helvetica-Bold').text('Property:');
      if (payment.project?.name) doc.font('Helvetica').text(`Project: ${payment.project.name}`);
      if (payment.plot?.plotNumber) doc.text(`Plot No: ${payment.plot.plotNumber}`);
      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown();
    }

    // Amount table
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Description', 50, tableTop, { width: 300 });
    doc.text('Amount', 400, tableTop, { width: 100, align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica');
    doc.text(`${payment.paymentType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} — ${payment.booking?.bookingId || ''}`, 50, doc.y, { width: 300 });
    doc.text(`Rs. ${(payment.amount || 0).toLocaleString('en-IN')}`, 400, doc.y - 12, { width: 100, align: 'right' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Totals
    doc.font('Helvetica-Bold').text('Amount Received:', 50, doc.y, { width: 300 });
    doc.text(`Rs. ${(payment.amount || 0).toLocaleString('en-IN')}`, 400, doc.y - 12, { width: 100, align: 'right' });

    if (payment.booking) {
      doc.moveDown(0.5);
      doc.font('Helvetica').text(`Total Booking: Rs. ${(payment.booking.totalAmount || 0).toLocaleString('en-IN')}`);
      doc.text(`Total Paid: Rs. ${(payment.booking.paidAmount || 0).toLocaleString('en-IN')}`);
      doc.text(`Outstanding: Rs. ${(payment.booking.remainingAmount || 0).toLocaleString('en-IN')}`);
    }

    if (payment.collectedBy?.name) {
      doc.moveDown();
      doc.text(`Collected By: ${payment.collectedBy.name}`);
    }

    doc.moveDown(3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').text('Thank you for your payment!', { align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /payments/:id/invoice — kept for backward compat (delegates to receipt)
export const downloadInvoice = downloadReceipt;

// ─── GET /payments/stats ──────────────────────────────────────────────────────
export const getPaymentStats = async (req, res) => {
  try {
    const byType = await Payment.aggregate([
      { $match: { transactionStatus: 'success', isActive: true } },
      { $group: { _id: '$paymentType', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $project: { paymentType: '$_id', total: 1, count: 1, _id: 0 } },
    ]);

    const byStatus = await Payment.aggregate([
      { $group: { _id: '$transactionStatus', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $project: { transactionStatus: '$_id', total: 1, count: 1, _id: 0 } },
    ]);

    const monthlyRevenue = await Payment.aggregate([
      { $match: { transactionStatus: 'success', isActive: true } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $project: { year: '$_id.year', month: '$_id.month', revenue: 1, count: 1, _id: 0 } },
    ]);

    res.status(200).json({
      success: true,
      data: { byType, byStatus, monthlyRevenue },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
