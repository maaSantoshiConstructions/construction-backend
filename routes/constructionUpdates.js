import express from 'express';
import { getUpdates, getUpdate, createUpdate, updateUpdate, deleteUpdate, getProjectUpdates, getMyPlotUpdates } from '../controllers/constructionUpdateController.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
const router = express.Router();

router.get('/', getUpdates);
router.get('/project/:projectId', getProjectUpdates);

router.get('/my-plot', protect, getMyPlotUpdates);

router.get('/:id', getUpdate);
router.post('/', protect, authorize('super_admin', 'company_admin'), upload.array('images', 5), createUpdate);
router.put('/:id', protect, authorize('super_admin', 'company_admin'), updateUpdate);
router.delete('/:id', protect, authorize('super_admin', 'company_admin'), deleteUpdate);

export default router;
