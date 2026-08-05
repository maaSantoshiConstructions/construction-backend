import asyncHandler from '../middleware/asyncHandler.js';
import * as customerService from '../services/customer.service.js';
import { calculateCustomerFinancials } from '../services/customerFinancial.service.js';

export { calculateCustomerFinancials };

export const getCustomers = asyncHandler(async (req, res) => {
  const { enrichedCustomers, total } = await customerService.fetchAllCustomers(req.query);
  res.status(200).json({
    success: true,
    count: enrichedCustomers.length,
    total,
    data: enrichedCustomers,
  });
});

export const getCustomer = asyncHandler(async (req, res) => {
  const data = await customerService.fetchCustomerById(req.params.id);
  if (!data) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  res.status(200).json({
    success: true,
    data,
  });
});

export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.createNewCustomer(req.body);
  res.status(201).json({ success: true, data: customer });
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomerById(req.params.id, req.body);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  res.status(200).json({ success: true, data: customer });
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.softDeleteCustomerById(req.params.id);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  res.status(200).json({ success: true, message: 'Customer deactivated successfully' });
});

export const getCustomerPurchaseHistory = asyncHandler(async (req, res) => {
  const bookings = await customerService.fetchCustomerPurchaseHistory(req.params.id);
  res.status(200).json({ success: true, count: bookings.length, data: bookings });
});

export const getMyProfile = asyncHandler(async (req, res) => {
  const data = await customerService.fetchMyProfile(req.user._id);
  res.status(200).json({
    success: true,
    data,
  });
});
