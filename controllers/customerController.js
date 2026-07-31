import Customer from '../models/Customer.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import SiteVisit from '../models/SiteVisit.js';
import APIFeatures from '../utils/apiFeatures.js';

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

  // Total Paid across ALL customer bookings = sum of paidAmount across all bookings owned by customer
  const totalPaid = bookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0);

  // Outstanding Amount = Sum of remainingAmount from all ACTIVE bookings
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

// ─── GET /customers — Manage Customers List Endpoint ─────────────────────────
export const getCustomers = async (req, res) => {
  try {
    const features = new APIFeatures(Customer.find({ isActive: true }), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const rawCustomers = await features.query
      .populate('user', 'name email phone avatar')
      .populate('project', 'name slug')
      .populate('plot', 'plotNumber size')
      .populate('booking', 'bookingId status');

    // Enrich each customer in list using the single-source-of-truth calculator
    const enrichedCustomers = await Promise.all(
      rawCustomers.map(async (cust) => {
        const custObj = cust.toObject();

        const financials = await calculateCustomerFinancials(cust);

        custObj.totalPaid = financials.totalPaid;
        custObj.propertiesCount = financials.totalProperties;

        return custObj;
      })
    );

    const total = await Customer.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      count: enrichedCustomers.length,
      total,
      data: enrichedCustomers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /customers/:id — Customer Details Endpoint ──────────────────────────
export const getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('user', 'name email phone avatar createdAt')
      .populate('project', 'name slug location')
      .populate('plot', 'plotNumber size facing price status')
      .populate('booking', 'bookingId status totalAmount tokenAmount paidAmount remainingAmount paymentStatus salesExecutive');

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Call the exact same single-source-of-truth calculator
    const financials = await calculateCustomerFinancials(customer);

    let siteVisits = [];
    try {
      const candidateIds = [customer._id];
      if (customer.user && customer.user._id) candidateIds.push(customer.user._id);
      else if (customer.user) candidateIds.push(customer.user);

      const bookingIds = financials.bookings.map((b) => b._id);

      siteVisits = await SiteVisit.find({
        $or: [
          { customer: { $in: candidateIds } },
          { booking: { $in: bookingIds } },
        ],
      })
        .populate('project', 'name')
        .populate('plot', 'plotNumber')
        .sort({ createdAt: -1 });
    } catch (e) {
      siteVisits = [];
    }

    res.status(200).json({
      success: true,
      data: {
        customer,
        bookings: financials.bookings,
        payments: financials.payments,
        siteVisits,
        financials,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('user', 'name email phone')
      .populate('project', 'name slug')
      .populate('plot', 'plotNumber size')
      .populate('booking', 'bookingId status');

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.status(200).json({ success: true, message: 'Customer deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCustomerPurchaseHistory = async (req, res) => {
  try {
    const customerRecord = await Customer.findById(req.params.id);
    const userIds = [req.params.id];
    if (customerRecord && customerRecord.user) {
      userIds.push(customerRecord.user);
    }

    const bookings = await Booking.find({ customer: { $in: userIds }, isActive: true })
      .populate('plot', 'plotNumber size facing price')
      .populate('project', 'name slug type')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const bookings = await Booking.find({ customer: req.user._id, isActive: true })
      .populate('plot', 'plotNumber size facing price')
      .populate('project', 'name slug type')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      data: {
        user,
        bookings,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
