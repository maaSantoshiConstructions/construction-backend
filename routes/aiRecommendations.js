import express from 'express';
import { createRecommendation, getRecommendations, getRecommendation, getRecommendationStats } from '../controllers/aiRecommendationController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();

router.post('/', createRecommendation);

router.get('/', protect, authorize('super_admin', 'company_admin'), getRecommendations);
router.get('/stats', protect, authorize('super_admin', 'company_admin'), getRecommendationStats);
router.get('/:id', protect, getRecommendation);

export default router;
