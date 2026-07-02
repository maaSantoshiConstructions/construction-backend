import express from 'express';
import { getApplications, getApplication, createApplication, updateApplication, getMyApplications, getApplicationStats } from '../controllers/loanApplicationController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();

router.get('/my-applications', protect, getMyApplications);

router.get('/', protect, authorize('super_admin', 'company_admin'), getApplications);
router.get('/stats', protect, authorize('super_admin', 'company_admin'), getApplicationStats);
router.get('/:id', protect, getApplication);
router.post('/', protect, createApplication);
router.put('/:id', protect, authorize('super_admin', 'company_admin'), updateApplication);

export default router;
