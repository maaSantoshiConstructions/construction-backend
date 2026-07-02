import express from 'express';
import { getReviews, getReview, createReview, approveReview, deleteReview, getProjectReviews, getPublicReviews } from '../controllers/reviewController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();

router.get('/', getReviews);
router.get('/public', getPublicReviews);
router.get('/project/:projectId', getProjectReviews);
router.get('/:id', getReview);

router.post('/', protect, createReview);
router.put('/:id/approve', protect, authorize('super_admin', 'company_admin'), approveReview);
router.delete('/:id', protect, authorize('super_admin', 'company_admin'), deleteReview);

export default router;
