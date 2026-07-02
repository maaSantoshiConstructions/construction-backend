import express from 'express';
import { getUsers, getUser, createUser, updateUser, deleteUser, getUserStats } from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();

router.use(protect, authorize('super_admin', 'company_admin'));

router.get('/', getUsers);
router.get('/stats', getUserStats);
router.get('/:id', getUser);
router.post('/', createUser);
router.put('/:id', updateUser);
router.put('/:id/deactivate', deleteUser);

export default router;
