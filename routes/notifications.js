import express from 'express';
import { getNotifications, markAsRead, markAllRead, getUnreadCount, createNotification } from '../controllers/notificationController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();

router.get('/', protect, getNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.put('/:id/read', protect, markAsRead);
router.put('/read-all', protect, markAllRead);
router.post('/', protect, authorize('super_admin', 'company_admin'), createNotification);

export default router;
