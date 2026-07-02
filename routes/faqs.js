import express from 'express';
import { getFAQs, createFAQ, updateFAQ, deleteFAQ } from '../controllers/faqController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();

router.get('/', getFAQs);

router.post('/', protect, authorize('super_admin', 'company_admin'), createFAQ);
router.put('/:id', protect, authorize('super_admin', 'company_admin'), updateFAQ);
router.delete('/:id', protect, authorize('super_admin', 'company_admin'), deleteFAQ);

export default router;
