import express from 'express';
import { getBlogs, getBlog, createBlog, updateBlog, deleteBlog, togglePublish } from '../controllers/blogController.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
const router = express.Router();

router.get('/', getBlogs);
router.get('/:slug', getBlog);

router.post('/', protect, authorize('super_admin', 'company_admin'), upload.single('image'), createBlog);
router.put('/:id', protect, authorize('super_admin', 'company_admin'), updateBlog);
router.put('/:id/publish', protect, authorize('super_admin', 'company_admin'), togglePublish);
router.delete('/:id', protect, authorize('super_admin', 'company_admin'), deleteBlog);

export default router;
