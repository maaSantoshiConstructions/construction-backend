import Customer from '../models/Customer.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import SiteVisit from '../models/SiteVisit.js';
import APIFeatures from '../utils/apiFeatures.js';
import { calculateCustomerFinancials } from './customerFinancial.service.js';

export const fetchAllCustomers = async (query) => {
  const features = new APIFeatures(Customer.find({ isActive: true }), query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const rawCustomers = await features.query
    .populate('user', 'name email phone avatar')
    .populate('project', 'name slug')
    .populate('plot', 'plotNumber size')
    .populate('booking', 'bookingId status');

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

  return { enrichedCustomers, total };
};

export const fetchCustomerById = async (id) => {
  const customer = await Customer.findById(id)
    .populate('user', 'name email phone avatar createdAt')
    .populate('project', 'name slug location')
    .populate('plot', 'plotNumber size facing price status')
    .populate('booking', 'bookingId status totalAmount tokenAmount paidAmount remainingAmount paymentStatus salesExecutive');

  if (!customer) return null;

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

  return {
    customer,
    bookings: financials.bookings,
    payments: financials.payments,
    siteVisits,
    financials,
  };
};

export const createNewCustomer = async (data) => {
  return await Customer.create(data);
};

export const updateCustomerById = async (id, data) => {
  return await Customer.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  })
    .populate('user', 'name email phone')
    .populate('project', 'name slug')
    .populate('plot', 'plotNumber size')
    .populate('booking', 'bookingId status');
};

export const softDeleteCustomerById = async (id) => {
  return await Customer.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );
};

export const fetchCustomerPurchaseHistory = async (id) => {
  const customerRecord = await Customer.findById(id);
  const userIds = [id];
  if (customerRecord && customerRecord.user) {
    userIds.push(customerRecord.user);
  }

  return await Booking.find({ customer: { $in: userIds }, isActive: true })
    .populate('plot', 'plotNumber size facing price')
    .populate('project', 'name slug type')
    .sort('-createdAt');
};

export const fetchMyProfile = async (userId) => {
  const user = await User.findById(userId);
  const bookings = await Booking.find({ customer: userId, isActive: true })
    .populate('plot', 'plotNumber size facing price')
    .populate('project', 'name slug type')
    .sort('-createdAt');

  return { user, bookings };
};
