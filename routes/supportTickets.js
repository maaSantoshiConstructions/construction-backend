import express from 'express';
import { getTickets, getTicket, createTicket, updateTicket, addReply, getMyTickets, closeTicket } from '../controllers/supportTicketController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();

router.get('/my-tickets', protect, getMyTickets);

router.get('/', protect, authorize('super_admin', 'company_admin', 'sales_executive'), getTickets);
router.get('/:id', protect, getTicket);
router.post('/', protect, createTicket);
router.put('/:id', protect, authorize('super_admin', 'company_admin'), updateTicket);
router.post('/:id/reply', protect, addReply);
router.put('/:id/close', protect, closeTicket);

export default router;
