import express from 'express';
import { getProjects, getProject, createProject, updateProject, deleteProject, uploadProjectImages, getProjectStats } from '../controllers/projectController.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { projectValidation } from '../middleware/validate.js';
const router = express.Router();

router.get('/', getProjects);
router.get('/:slug', getProject);

router.post('/', protect, authorize('super_admin', 'company_admin'), projectValidation, createProject);
router.put('/:id', protect, authorize('super_admin', 'company_admin'), updateProject);
router.delete('/:id', protect, authorize('super_admin', 'company_admin'), deleteProject);
router.put('/:id/images', protect, authorize('super_admin', 'company_admin'), upload.array('images', 10), uploadProjectImages);
router.get('/:id/stats', protect, getProjectStats);

export default router;
