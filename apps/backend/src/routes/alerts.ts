import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { checkAlertLimit } from '../middlewares/planGuard';
import {
  getAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
} from '../controllers/alertController';

const router = Router();

// GET /v1/users/me/alerts
router.get('/', requireAuth, getAlerts);

// POST /v1/users/me/alerts
router.post('/', requireAuth, checkAlertLimit, createAlert);

// PATCH /v1/users/me/alerts/:id
router.patch('/:id', requireAuth, updateAlert);

// DELETE /v1/users/me/alerts/:id
router.delete('/:id', requireAuth, deleteAlert);

export default router;
