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

// Images upload route with clean Multer error handling
router.put(
  '/:id/images',
  protect,
  authorize('super_admin', 'company_admin'),
  (req, res, next) => {
    upload.array('images', 10)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'File too large. Maximum file size allowed is 5MB per image.' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ success: false, message: 'Maximum 10 images allowed per upload.' });
        }
        return res.status(400).json({ success: false, message: err.message || 'Image upload failed.' });
      }
      next();
    });
  },
  uploadProjectImages
);

router.get('/:id/stats', protect, getProjectStats);

export default router;
