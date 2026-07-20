import express from 'express';
import { getDocuments, getDocument, uploadDocument, verifyDocument, deleteDocument, getMyDocuments } from '../controllers/documentController.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
const router = express.Router();

router.get('/my-documents', protect, getMyDocuments);

router.get('/', protect, authorize('super_admin', 'company_admin'), getDocuments);
router.get('/:id', protect, getDocument);
router.post('/', protect, upload.single('file'), uploadDocument);
router.patch('/:id/verify', protect, authorize('super_admin', 'company_admin'), verifyDocument);
router.delete('/:id', protect, authorize('super_admin', 'company_admin'), deleteDocument);

export default router;
