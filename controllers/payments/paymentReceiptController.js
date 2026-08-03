import Payment from '../../models/Payment.js';
import { generateReceiptPdf } from '../../utils/receiptPdfGenerator.js';

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

    generateReceiptPdf(res, payment);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /payments/:id/invoice — kept for backward compat ──────────────────────
export const downloadInvoice = downloadReceipt;
