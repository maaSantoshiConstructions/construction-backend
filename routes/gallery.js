import express from 'express';
import { getGalleryItems, getGalleryItem, createGalleryItem, updateGalleryItem, deleteGalleryItem } from '../controllers/galleryController.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
const router = express.Router();

router.get('/', getGalleryItems);
router.get('/:id', getGalleryItem);

router.post('/', protect, authorize('super_admin', 'company_admin'), upload.array('images', 10), createGalleryItem);
router.put('/:id', protect, authorize('super_admin', 'company_admin'), updateGalleryItem);
router.delete('/:id', protect, authorize('super_admin', 'company_admin'), deleteGalleryItem);

export default router;
