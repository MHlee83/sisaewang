import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth';
import { deleteFirebaseUser } from '../utils/firebase';
import { logger } from '../utils/logger';
import { z } from 'zod';

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, uid: true, email: true, nickname: true,
      userType: true, isPremium: true, createdAt: true,
    },
  });
  res.json({ ...user, plan: req.user!.plan });
}

export async function getUserItems(req: AuthRequest, res: Response): Promise<void> {
  const items = await prisma.userItem.findMany({
    where: { userId: req.user!.id },
    include: {
      item:   { select: { itemCode: true, itemName: true, categoryCode: true, categoryName: true } },
      market: { select: { name: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  res.json(items.map((ui) => ({
    id:          ui.id.toString(),
    itemId:      ui.itemId,
    itemCode:    ui.item.itemCode,
    itemName:    ui.item.itemName,
    categoryCode: ui.item.categoryCode,
    marketId:    ui.marketId,
    marketName:  ui.market?.name ?? null,
    gradeCode:   ui.gradeCode,
    sortOrder:   ui.sortOrder,
  })));
}

const AddItemSchema = z.object({
  itemCode:   z.string(),
  marketCode: z.string().optional(),
  gradeCode:  z.string().optional(),
});

export async function addUserItem(req: AuthRequest, res: Response): Promise<void> {
  const parsed = AddItemSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.errors }); return; }

  const { itemCode, marketCode, gradeCode } = parsed.data;

  const item   = await prisma.item.findUnique({ where: { itemCode } });
  if (!item) { res.status(404).json({ error: 'ITEM_NOT_FOUND' }); return; }

  const market = marketCode
    ? await prisma.market.findUnique({ where: { code: marketCode } })
    : null;

  const userItem = await prisma.userItem.create({
    data: {
      userId:    req.user!.id,
      itemId:    item.id,
      marketId:  market?.id ?? null,
      gradeCode: gradeCode ?? null,
    },
  });

  res.status(201).json({ id: userItem.id.toString() });
}

export async function removeUserItem(req: AuthRequest, res: Response): Promise<void> {
  const id = BigInt(req.params.id);
  await prisma.userItem.deleteMany({ where: { id, userId: req.user!.id } });
  res.status(204).send();
}

export async function reorderUserItems(req: AuthRequest, res: Response): Promise<void> {
  const { orders } = req.body as { orders: Array<{ id: string; sortOrder: number }> };
  if (!Array.isArray(orders)) { res.status(400).json({ error: 'INVALID_INPUT' }); return; }

  await Promise.all(
    orders.map(({ id, sortOrder }) =>
      prisma.userItem.updateMany({
        where:  { id: BigInt(id), userId: req.user!.id },
        data:   { sortOrder },
      }),
    ),
  );
  res.status(204).send();
}

// ── PATCH /v1/users/me — userType 업데이트 ───────────────────────
export async function updateMe(req: AuthRequest, res: Response): Promise<void> {
  const { userType } = req.body as { userType?: string };
  if (!userType) { res.status(400).json({ error: 'INVALID_INPUT' }); return; }

  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data:  { userType: userType as any },
    select: { id: true, userType: true },
  });
  res.json(updated);
}

// ── PATCH /v1/users/me/fcm-token — FCM 토큰 저장 ────────────────
export async function updateFcmToken(req: AuthRequest, res: Response): Promise<void> {
  const { fcmToken } = req.body as { fcmToken?: string };
  if (!fcmToken) { res.status(400).json({ error: 'INVALID_INPUT' }); return; }

  await prisma.user.update({
    where: { id: req.user!.id },
    data:  { fcmToken },
  });
  res.status(204).send();
}

// ── DELETE /v1/users/me — 회원 탈퇴 ─────────────────────────────
// 연관 데이터를 정리하고 사용자 레코드를 삭제한 뒤 Firebase 계정까지 제거한다.
// 작성한 게시글/댓글은 작성자만 NULL로 비식별 처리되어 보존된다(스키마 onDelete: SetNull).
export async function deleteMe(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const uid    = req.user!.uid;

  try {
    // onDelete가 지정되지 않은 관계는 User 삭제 전에 직접 제거해야 FK 제약을 통과한다.
    await prisma.$transaction([
      prisma.alertLog.deleteMany({ where: { userId } }),
      prisma.communityReport.deleteMany({ where: { reporterId: userId } }),
      prisma.subscription.deleteMany({ where: { userId } }),
      // User 삭제 → userItems / alerts / communityLikes 는 Cascade,
      //            communityPosts / communityComments 의 authorId 는 SetNull
      prisma.user.delete({ where: { id: userId } }),
    ]);
  } catch (err) {
    logger.error('회원 탈퇴 DB 처리 실패:', err);
    res.status(500).json({ error: 'DELETE_FAILED', message: '회원 탈퇴 처리 중 오류가 발생했습니다.' });
    return;
  }

  // Firebase 계정 삭제 (DB는 이미 삭제됨 — 실패해도 탈퇴는 성립, best-effort)
  try {
    await deleteFirebaseUser(uid);
  } catch (err) {
    logger.error('회원 탈퇴 Firebase 계정 삭제 실패:', { uid, err });
  }

  res.status(204).send();
}
  