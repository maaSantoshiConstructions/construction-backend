import express from 'express';
import { createComparison, getMyComparisons, getComparison, deleteComparison } from '../controllers/propertyComparisonController.js';
import { protect } from '../middleware/auth.js';
const router = express.Router();

router.post('/', protect, createComparison);
router.get('/my-comparisons', protect, getMyComparisons);
router.get('/:id', protect, getComparison);
router.delete('/:id', protect, deleteComparison);

export default router;
