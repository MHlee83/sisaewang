import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth';
import { z } from 'zod';

const AlertCreateSchema = z.object({
  itemId:         z.number().int(),
  marketId:       z.number().int().nullable(),
  alertType:      z.enum(['PRICE_ABOVE', 'PRICE_BELOW', 'CHANGE_RATE', 'VS_AVERAGE']),
  thresholdValue: z.number(),
});

export async function getAlerts(req: AuthRequest, res: Response): Promise<void> {
  const alerts = await prisma.alert.findMany({
    where: { userId: req.user!.id },
    include: {
      item:   { select: { itemName: true } },
      market: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(alerts.map((a) => ({
    id:             a.id.toString(),
    itemId:         a.itemId,
    itemName:       a.item.itemName,
    marketId:       a.marketId,
    marketName:     a.market?.name ?? null,
    alertType:      a.alertType,
    thresholdValue: Number(a.thresholdValue),
    isActive:       a.isActive,
    lastFiredAt:    a.lastFiredAt?.toISOString() ?? null,
    createdAt:      a.createdAt.toISOString(),
  })));
}

export async function createAlert(req: AuthRequest, res: Response): Promise<void> {
  const parsed = AlertCreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.errors }); return; }

  const alert = await prisma.alert.create({
    data: {
      userId:         req.user!.id,
      itemId:         parsed.data.itemId,
      marketId:       parsed.data.marketId,
      alertType:      parsed.data.alertType,
      thresholdValue: parsed.data.thresholdValue,
    },
  });

  res.status(201).json({ id: alert.id.toString() });
}

export async function updateAlert(req: AuthRequest, res: Response): Promise<void> {
  const id       = BigInt(req.params.id);
  const { isActive } = req.body as { isActive: boolean };

  await prisma.alert.updateMany({
    where: { id, userId: req.user!.id },
    data:  { isActive },
  });
  res.status(204).send();
}

export async function deleteAlert(req: AuthRequest, res: Response): Promise<void> {
  const id = BigInt(req.params.id);
  await prisma.alert.deleteMany({ where: { id, userId: req.user!.id } });
  res.status(204).send();
}
