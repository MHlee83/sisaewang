import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth';
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
        where: { id: BigInt(id), userId: req.user!.id },
        data:  { sortOrder },
      })
    )
  );
  res.status(204).send();
}
