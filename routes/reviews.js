import express from 'express';
import { getReviews, createReview, voteHelpful } from '../controllers/reviewController.js';

const router = express.Router();

router.get('/', getReviews);
router.post('/', createReview);
router.post('/:id/helpful', voteHelpful);

export default router;
