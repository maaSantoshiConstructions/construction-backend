import PDFDocument from 'pdfkit';

/**
 * Shared helper: Generate PDF payment receipt and pipe to response stream
 */
export const generateReceiptPdf = (res, payment) => {
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
  doc.text(`${payment.paymentType?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} — ${payment.booking?.bookingId || ''}`, 50, doc.y, { width: 300 });
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
};
