import Customer from '../models/Customer.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import APIFeatures from '../utils/apiFeatures.js';

export const getCustomers = async (req, res) => {
  try {
    const features = new APIFeatures(Customer.find({ isActive: true }), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const customers = await features.query
      .populate('user', 'name email phone avatar')
      .populate('project', 'name slug')
      .populate('plot', 'plotNumber size')
      .populate('booking', 'bookingId status');

    const total = await Customer.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      count: customers.length,
      total,
      data: customers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('user', 'name email phone avatar')
      .populate('project', 'name slug')
      .populate('plot', 'plotNumber size facing price status')
      .populate('booking', 'bookingId status totalAmount tokenAmount');

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.status(200).json({ success: true, data: customer });
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
    const bookings = await Booking.find({ customer: req.params.id, isActive: true })
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
