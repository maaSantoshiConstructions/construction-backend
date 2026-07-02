import express from 'express';
import { getSettings, getSetting, updateSetting, getPublicSettings } from '../controllers/settingController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();

router.get('/public', getPublicSettings);

router.get('/', protect, authorize('super_admin', 'company_admin'), getSettings);
router.get('/:key', protect, authorize('super_admin', 'company_admin'), getSetting);
router.put('/:key', protect, authorize('super_admin', 'company_admin'), updateSetting);

export default router;
