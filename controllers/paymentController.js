import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import PDFDocument from 'pdfkit';
import APIFeatures from '../utils/apiFeatures.js';

export const getPayments = async (req, res) => {
  try {
    const features = new APIFeatures(Payment.find({ isActive: true }), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const payments = await features.query
      .populate('booking', 'bookingId')
      .populate('customer', 'name email phone');

    const total = await Payment.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('booking', 'bookingId totalAmount status')
      .populate('customer', 'name email phone');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPayment = async (req, res) => {
  try {
    const { booking: bookingId, amount, paymentType, paymentMethod, transactionId, status } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const payment = await Payment.create({
      booking: bookingId,
      customer: booking.customer,
      amount,
      paymentType,
      paymentMethod,
      transactionId,
      status: status || 'pending',
      paidAt: status === 'completed' ? new Date() : undefined,
    });

    if (paymentType === 'token' && status === 'completed') {
      booking.status = 'partial';
      await booking.save();
    }

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBookingPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ booking: req.params.bookingId, isActive: true })
      .populate('customer', 'name email')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyPayments = async (req, res) => {
  try {
    const features = new APIFeatures(
      Payment.find({ customer: req.user._id, isActive: true }),
      req.query
    )
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const payments = await features.query.populate('booking', 'bookingId totalAmount');

    const total = await Payment.countDocuments({ customer: req.user._id, isActive: true });

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const downloadInvoice = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('booking', 'bookingId totalAmount')
      .populate('customer', 'name email phone');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${payment._id}.pdf`);

    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold').text('Jai Santoshi Maa Infrastructure Pvt. Ltd.', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Building Dreams, Delivering Excellence', { align: 'center' });
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    doc.fontSize(10).font('Helvetica-Bold').text(`Invoice #: INV-${payment._id.toString().slice(-8).toUpperCase()}`);
    doc.font('Helvetica').text(`Date: ${payment.createdAt.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`);
    doc.text(`Booking ID: ${payment.booking.bookingId}`);
    doc.text(`Payment Method: ${payment.paymentMethod}`);
    doc.text(`Payment Type: ${payment.paymentType}`);
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Bill To:');
    doc.font('Helvetica').text(`Name: ${payment.customer.name}`);
    doc.text(`Email: ${payment.customer.email}`);
    if (payment.customer.phone) doc.text(`Phone: ${payment.customer.phone}`);
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Description', 50, tableTop, { width: 300 });
    doc.text('Amount', 400, tableTop, { width: 100, align: 'right' });

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica');
    doc.text(`${payment.paymentType.charAt(0).toUpperCase() + payment.paymentType.slice(1)} Payment - ${payment.booking.bookingId}`, 50, doc.y, { width: 300 });
    doc.text(`Rs. ${payment.amount.toLocaleString('en-IN')}`, 400, doc.y - 12, { width: 100, align: 'right' });

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    doc.font('Helvetica-Bold');
    doc.text('Total:', 50, doc.y, { width: 300 });
    doc.text(`Rs. ${payment.amount.toLocaleString('en-IN')}`, 400, doc.y - 12, { width: 100, align: 'right' });

    if (payment.transactionId) {
      doc.moveDown(2);
      doc.font('Helvetica').text(`Transaction ID: ${payment.transactionId}`);
      doc.text(`Status: ${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}`);
    }

    doc.moveDown(3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').text('Thank you for your business!', { align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPaymentStats = async (req, res) => {
  try {
    const paymentsByType = await Payment.aggregate([
      { $match: { isActive: true, status: 'completed' } },
      {
        $group: {
          _id: '$paymentType',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $project: { paymentType: '$_id', total: 1, count: 1, _id: 0 } },
    ]);

    const monthlyRevenue = await Payment.aggregate([
      { $match: { isActive: true, status: 'completed' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      {
        $project: {
          year: '$_id.year',
          month: '$_id.month',
          revenue: 1,
          count: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        paymentsByType,
        monthlyRevenue,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
