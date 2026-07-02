import express from 'express';
import { getLeads, getLead, createLead, updateLead, assignLead, getMyLeads, getLeadStats, addNote, deleteLead } from '../controllers/leadController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();

router.post('/', createLead);

router.get('/my-leads', protect, authorize('sales_executive'), getMyLeads);
router.get('/stats', protect, authorize('super_admin', 'company_admin'), getLeadStats);

router.get('/', protect, authorize('super_admin', 'company_admin', 'sales_executive'), getLeads);
router.get('/:id', protect, authorize('super_admin', 'company_admin', 'sales_executive'), getLead);
router.put('/:id', protect, authorize('super_admin', 'company_admin', 'sales_executive'), updateLead);
router.put('/:id/assign', protect, authorize('super_admin', 'company_admin'), assignLead);
router.post('/:id/notes', protect, authorize('super_admin', 'company_admin', 'sales_executive'), addNote);
router.delete('/:id', protect, authorize('super_admin', 'company_admin'), deleteLead);

export default router;
