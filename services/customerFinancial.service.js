import Customer from '../models/Customer.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';

/**
 * ─── SINGLE SOURCE OF TRUTH: FINANCIAL CALCULATOR ────────────────────────────
 * Calculates exact aggregated financials for a customer across ALL their bookings.
 * Shared between getCustomers (list) and getCustomer (details).
 */
export const calculateCustomerFinancials = async (customerInput) => {
  let customerId = null;
  let userId = null;

  if (typeof customerInput === 'object' && customerInput !== null) {
    customerId = customerInput._id;
    userId = customerInput.user?._id || customerInput.user;
  } else {
    customerId = customerInput;
    const custDoc = await Customer.findById(customerId);
    if (custDoc) {
      userId = custDoc.user;
    }
  }

  // Candidate IDs (Customer _id and User _id)
  const candidateIds = [customerId];
  if (userId) {
    candidateIds.push(userId.toString());
  }

  // 1. Fetch ALL active bookings belonging to this customer
  const bookings = await Booking.find({
    customer: { $in: candidateIds },
    isActive: true,
  })
    .populate('plot', 'plotNumber size facing price ratePerSqYd')
    .populate('project', 'name slug location')
    .populate('salesExecutive', 'name email phone')
    .sort({ createdAt: -1 });

  const bookingIds = bookings.map((b) => b._id);

  // 2. Fetch ALL payments linked to these bookings or candidate user IDs
  const payments = await Payment.find({
    $or: [
      { booking: { $in: bookingIds } },
      { customer: { $in: candidateIds } },
    ],
  })
    .populate('booking', 'bookingId')
    .populate('project', 'name')
    .populate('plot', 'plotNumber')
    .populate('collectedBy', 'name email')
    .sort({ createdAt: -1 });

  // 3. Property & Status Counts
  const totalProperties = bookings.length;
  const activeBookingsCount = bookings.filter((b) => (b.bookingStatus || b.status) === 'active').length;
  const completedBookingsCount = bookings.filter((b) => (b.bookingStatus || b.status) === 'completed').length;
  const cancelledBookingsCount = bookings.filter((b) => (b.bookingStatus || b.status) === 'cancelled').length;

  // 4. Financial Calculations
  const totalBookingValue = bookings.reduce((sum, b) => sum + (b.totalAmount || b.amount || 0), 0);
  const totalPaid = bookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0);

  const activeBookings = bookings.filter((b) => (b.bookingStatus || b.status) === 'active');
  const totalOutstanding = activeBookings.reduce(
    (sum, b) => sum + (b.remainingAmount ?? Math.max(0, (b.totalAmount || 0) - (b.paidAmount || 0))),
    0
  );

  const refundedPayments = payments.filter((p) => p.transactionStatus === 'refunded');
  const totalRefunded = refundedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return {
    bookings,
    payments,
    totalProperties,
    activeBookingsCount,
    completedBookingsCount,
    cancelledBookingsCount,
    totalBookingValue,
    totalPaid,
    totalOutstanding,
    totalRefunded,
  };
};
