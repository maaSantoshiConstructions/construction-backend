import express from 'express';
import { getAdminDashboard, getSalesDashboard, getCustomerDashboard, getPartnerDashboard } from '../controllers/dashboardController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();

router.get('/admin', protect, authorize('super_admin', 'company_admin'), getAdminDashboard);
router.get('/sales', protect, authorize('sales_executive'), getSalesDashboard);
router.get('/customer', protect, authorize('customer'), getCustomerDashboard);
router.get('/partner', protect, authorize('channel_partner'), getPartnerDashboard);

export default router;
