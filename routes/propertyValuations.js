import express from 'express';
import { createValuation, getValuations, getValuation, updateStatus } from '../controllers/propertyValuationController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();

router.post('/', createValuation);
router.get('/', protect, authorize('super_admin', 'company_admin'), getValuations);
router.get('/:id', protect, authorize('super_admin', 'company_admin'), getValuation);
router.patch('/:id/status', protect, authorize('super_admin', 'company_admin'), updateStatus);

export default router;
