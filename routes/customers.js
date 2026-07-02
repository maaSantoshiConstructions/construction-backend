import express from 'express';
import { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, getCustomerPurchaseHistory, getMyProfile } from '../controllers/customerController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();

router.get('/my-profile', protect, getMyProfile);

router.get('/', protect, authorize('super_admin', 'company_admin', 'sales_executive'), getCustomers);
router.get('/:id', protect, authorize('super_admin', 'company_admin'), getCustomer);
router.get('/:id/purchases', protect, authorize('super_admin', 'company_admin'), getCustomerPurchaseHistory);
router.post('/', protect, authorize('super_admin', 'company_admin'), createCustomer);
router.put('/:id', protect, authorize('super_admin', 'company_admin'), updateCustomer);
router.delete('/:id', protect, authorize('super_admin', 'company_admin'), deleteCustomer);

export default router;
