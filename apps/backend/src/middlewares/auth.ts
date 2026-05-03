import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseToken } from '../utils/firebase';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: bigint;
    uid: string;
    email: string | null;
    userType: string;
    plan: string;
    isPremium: boolean;
  };
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: '인증이 필요합니다.' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = await verifyFirebaseToken(token);

    // DB에서 사용자 조회 (없으면 자동 생성)
    let user = await prisma.user.findUnique({ where: { uid: decoded.uid } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          uid: decoded.uid,
          email: decoded.email ?? null,
          nickname: decoded.name ?? null,
        },
      });
      logger.info(`신규 사용자 생성: ${user.uid}`);
    }

    // 구독 플랜 확인
    const activeSub = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    const plan = activeSub?.plan ?? 'FREE';

    req.user = {
      id: user.id,
      uid: user.uid,
      email: user.email,
      userType: user.userType,
      plan,
      isPremium: plan !== 'FREE',
    };

    next();
  } catch (err) {
    logger.warn('Firebase 토큰 검증 실패:', err);
    res.status(401).json({ error: 'INVALID_TOKEN', message: '유효하지 않은 토큰입니다.' });
  }
}

export function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }
  requireAuth(req, _res, next);
}
