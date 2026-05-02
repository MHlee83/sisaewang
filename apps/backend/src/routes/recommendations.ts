import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { requirePlan } from '../middlewares/planGuard';
import { getRecommendation } from '../controllers/recommendationController';

const router = Router();

// GET /v1/recommendations/:itemCode  — PREMIUM 이상
router.get('/:itemCode', requireAuth, requirePlan('PREMIUM'), getRecommendation);

export default router;
