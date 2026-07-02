import express from 'express';
import { createMessage, getConversation, getConversations, getConversationById } from '../controllers/chatbotController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();

router.post('/', createMessage);
router.get('/conversation/:sessionId', getConversation);
router.get('/', protect, authorize('super_admin', 'company_admin'), getConversations);
router.get('/:id', protect, authorize('super_admin', 'company_admin'), getConversationById);

export default router;
