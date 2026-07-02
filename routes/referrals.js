import express from 'express';
import { getReferrals, getReferral, createReferral, getMyReferrals, getReferralStats, markCommissionPaid } from '../controllers/referralController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();

router.get('/my-referrals', protect, getMyReferrals);

router.get('/', protect, authorize('super_admin', 'company_admin'), getReferrals);
router.get('/stats', protect, authorize('super_admin', 'company_admin'), getReferralStats);
router.get('/:id', protect, authorize('super_admin', 'company_admin'), getReferral);
router.post('/', protect, authorize('super_admin', 'company_admin', 'channel_partner'), createReferral);
router.put('/:id/commission', protect, authorize('super_admin', 'company_admin'), markCommissionPaid);

export default router;
