import express from 'express';
import { getSiteVisits, getSiteVisit, createSiteVisit, updateSiteVisit, confirmVisit, completeVisit, getMyVisits, getVisitStats } from '../controllers/siteVisitController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();

router.get('/my-visits', protect, getMyVisits);

router.get('/', protect, authorize('super_admin', 'company_admin', 'sales_executive'), getSiteVisits);
router.get('/stats', protect, authorize('super_admin', 'company_admin'), getVisitStats);
router.get('/:id', protect, getSiteVisit);
router.post('/', protect, createSiteVisit);
router.put('/:id', protect, authorize('super_admin', 'company_admin'), updateSiteVisit);
router.put('/:id/confirm', protect, authorize('super_admin', 'company_admin'), confirmVisit);
router.put('/:id/complete', protect, authorize('super_admin', 'company_admin', 'sales_executive'), completeVisit);

export default router;
