import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { checkItemLimit } from '../middlewares/planGuard';
import {
  getMe,
  getUserItems,
  addUserItem,
  removeUserItem,
  reorderUserItems,
} from '../controllers/userController';

const router = Router();

// GET /v1/users/me
router.get('/me', requireAuth, getMe);

// GET /v1/users/me/items
router.get('/me/items', requireAuth, getUserItems);

// POST /v1/users/me/items
router.post('/me/items', requireAuth, checkItemLimit, addUserItem);

// DELETE /v1/users/me/items/:id
router.delete('/me/items/:id', requireAuth, removeUserItem);

// PATCH /v1/users/me/items/reorder
router.patch('/me/items/reorder', requireAuth, reorderUserItems);

export default router;
