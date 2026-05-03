import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth';
import { logger } from '../utils/logger';

export async function getMySubscription(req: AuthRequest, res: Response): Promise<void> {
  const sub = await prisma.subscription.findFirst({
    where: { userId: req.user!.id, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    plan:      sub?.plan ?? 'FREE',
    expiresAt: sub?.expiresAt?.toISOString() ?? null,
    platform:  sub?.platform ?? null,
    isActive:  sub?.isActive ?? true,
  });
}

export async function verifyPurchase(req: AuthRequest, res: Response): Promise<void> {
  const { platform, purchaseToken, productId } = req.body as {
    platform: string;
    purchaseToken: string;
    productId: string;
  };

  // TODO: RevenueCat API로 영수증 검증
  // https://api.revenuecat.com/v1/receipts
  logger.info(`구독 검증 요청: userId=${req.user!.id}, productId=${productId}, platform=${platform}`);

  const PRODUCT_PLAN_MAP: Record<string, string> = {
    'kr.sisaewang.premium.monthly':  'PREMIUM',
    'kr.sisaewang.premium.yearly':   'PREMIUM',
    'kr.sisaewang.business.monthly': 'BUSINESS',
    'sisaewang_premium_monthly':     'PREMIUM',
    'sisaewang_premium_yearly':      'PREMIUM',
    'sisaewang_business_monthly':    'BUSINESS',
  };

  const plan = PRODUCT_PLAN_MAP[productId] ?? 'PREMIUM';
  const isYearly = productId.includes('yearly');
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + (isYearly ? 12 : 1));

  // 기존 구독 비활성화
  await prisma.subscription.updateMany({
    where: { userId: req.user!.id, isActive: true },
    data:  { isActive: false },
  });

  // 새 구독 생성
  const sub = await prisma.subscription.create({
    data: {
      userId:        req.user!.id,
      plan,
      platform,
      purchaseToken,
      productId,
      startedAt:     new Date(),
      expiresAt,
      isActive:      true,
    },
  });

  // 사용자 isPremium 업데이트
  await prisma.user.update({
    where: { id: req.user!.id },
    data:  { isPremium: true },
  });

  res.json({ plan, expiresAt: sub.expiresAt?.toISOString() });
}

export async function cancelSubscription(req: AuthRequest, res: Response): Promise<void> {
  await prisma.subscription.updateMany({
    where: { userId: req.user!.id, isActive: true },
    data:  { isActive: false },
  });
  await prisma.user.update({
    where: { id: req.user!.id },
    data:  { isPremium: false },
  });
  res.status(204).send();
}
