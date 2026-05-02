import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import {
  getMySubscription,
  verifyPurchase,
  cancelSubscription,
} from '../controllers/subscriptionController';

const router = Router();

// GET /v1/subscriptions/me
router.get('/me', requireAuth, getMySubscription);

// POST /v1/subscriptions/verify
router.post('/verify', requireAuth, verifyPurchase);

// POST /v1/subscriptions/cancel
router.post('/cancel', requireAuth, cancelSubscription);

export default router;
