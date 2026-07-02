import express from 'express';
import { getPartners, getPartner, registerPartner, updatePartner, verifyPartner, getMyPartnerProfile, getPartnerStats } from '../controllers/channelPartnerController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();

router.post('/register', registerPartner);

router.get('/my-profile', protect, getMyPartnerProfile);

router.get('/', protect, authorize('super_admin', 'company_admin'), getPartners);
router.get('/stats', protect, authorize('super_admin', 'company_admin'), getPartnerStats);
router.get('/:id', protect, authorize('super_admin', 'company_admin'), getPartner);
router.put('/:id', protect, authorize('super_admin', 'company_admin'), updatePartner);
router.put('/:id/verify', protect, authorize('super_admin', 'company_admin'), verifyPartner);

export default router;
