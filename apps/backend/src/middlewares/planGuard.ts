import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

type Plan = 'FREE' | 'PREMIUM' | 'BUSINESS' | 'ENTERPRISE';

const PLAN_ORDER: Record<Plan, number> = {
  FREE: 0,
  PREMIUM: 1,
  BUSINESS: 2,
  ENTERPRISE: 3,
};

/**
 * 최소 플랜 이상인 경우만 통과
 * 사용 예: router.get('/...', requireAuth, requirePlan('PREMIUM'), handler)
 */
export function requirePlan(minPlan: Plan) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    const userPlanLevel = PLAN_ORDER[user.plan as Plan] ?? 0;
    const requiredLevel = PLAN_ORDER[minPlan];

    if (userPlanLevel < requiredLevel) {
      res.status(403).json({
        error: 'PLAN_REQUIRED',
        requiredPlan: minPlan,
        currentPlan: user.plan,
        message: `${minPlan} 플랜 이상에서 이용 가능합니다.`,
      });
      return;
    }

    next();
  };
}

/**
 * FREE 플랜 관심 품목 수 제한 (3개) 체크
 */
export async function checkItemLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (req.user?.plan !== 'FREE') {
    next();
    return;
  }

  const { prisma } = await import('../utils/prisma');
  const count = await prisma.userItem.count({
    where: { userId: req.user.id },
  });

  if (count >= 3) {
    res.status(403).json({
      error: 'ITEM_LIMIT_EXCEEDED',
      message: 'FREE 플랜에서는 관심 품목을 최대 3개까지 등록할 수 있습니다.',
      requiredPlan: 'PREMIUM',
    });
    return;
  }

  next();
}

/**
 * FREE 플랜 알림 수 제한 (1개) 체크
 */
export async function checkAlertLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (req.user?.plan !== 'FREE') {
    next();
    return;
  }

  const { prisma } = await import('../utils/prisma');
  const count = await prisma.alert.count({
    where: { userId: req.user.id, isActive: true },
  });

  if (count >= 1) {
    res.status(403).json({
      error: 'ALERT_LIMIT_EXCEEDED',
      message: 'FREE 플랜에서는 알림을 최대 1개까지 설정할 수 있습니다.',
      requiredPlan: 'PREMIUM',
    });
    return;
  }

  next();
}
