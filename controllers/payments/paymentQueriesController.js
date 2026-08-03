import Payment from '../../models/Payment.js';
import APIFeatures from '../../utils/apiFeatures.js';

// ─── GET /payments ────────────────────────────────────────────────────────────
export const getPayments = async (req, res) => {
  try {
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

// ─── GET /payments/booking/:bookingId — all payments for a booking ────────────
export const getBookingPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ booking: req.params.bookingId })
      .populate('collectedBy', 'name email')
      .populate('cancelledBy', 'name')
      .sort({ createdAt: 1 });

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
