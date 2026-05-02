import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { getCache, setCache, CacheKeys, CacheTTL } from '../utils/redis';
import dayjs from 'dayjs';

export async function getItems(req: Request, res: Response): Promise<void> {
  const { categoryCode, keyword, page = '1', limit = '50' } = req.query as Record<string, string>;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const skip     = (pageNum - 1) * limitNum;

  const cacheKey = CacheKeys.itemList(categoryCode ?? 'all', pageNum);
  if (!keyword) {
    const cached = await getCache<unknown>(cacheKey);
    if (cached) { res.json(cached); return; }
  }

  const where: Record<string, unknown> = {
    isActive: true,
    ...(categoryCode && { categoryCode }),
    ...(keyword && {
      itemName: { contains: keyword, mode: 'insensitive' },
    }),
  };

  const [items, total] = await Promise.all([
    prisma.item.findMany({ where, skip, take: limitNum, orderBy: { itemCode: 'asc' } }),
    prisma.item.count({ where }),
  ]);

  const result = { items, total, page: pageNum, limit: limitNum };

  if (!keyword) await setCache(cacheKey, result, CacheTTL.ITEM_LIST);
  res.json(result);
}

export async function getItemDetail(req: Request, res: Response): Promise<void> {
  const { itemCode } = req.params;

  const item = await prisma.item.findUnique({ where: { itemCode } });
  if (!item) { res.status(404).json({ error: 'ITEM_NOT_FOUND' }); return; }

  // 오늘 최신 경락가 조회
  const today     = dayjs().startOf('day').toDate();
  const yesterday = dayjs().subtract(1, 'day').startOf('day').toDate();

  const [todayPrices, yesterdayPrices] = await Promise.all([
    prisma.auctionPrice.findMany({
      where: { itemId: item.id, saleDate: today },
      orderBy: { avgPrice: 'desc' },
      take: 1,
    }),
    prisma.auctionPrice.findMany({
      where: { itemId: item.id, saleDate: yesterday },
      orderBy: { avgPrice: 'desc' },
      take: 1,
    }),
  ]);

  const todayAvg     = todayPrices[0]     ? Number(todayPrices[0].avgPrice)     : null;
  const yesterdayAvg = yesterdayPrices[0] ? Number(yesterdayPrices[0].avgPrice) : null;
  const todayChange  =
    todayAvg && yesterdayAvg
      ? ((todayAvg - yesterdayAvg) / yesterdayAvg) * 100
      : null;

  res.json({
    item,
    latestPrices: {
      avgPrice: todayAvg,
      saleDate: dayjs(today).format('YYYY-MM-DD'),
    },
    todayChange,
  });
}
