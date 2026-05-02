import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { getCache, setCache, CacheKeys, CacheTTL } from '../utils/redis';
import dayjs from 'dayjs';

// ===== 경락가격 목록 =====
export async function getAuctionPrices(req: Request, res: Response): Promise<void> {
  const { itemCode, marketCode, date, gradeCode, page = '1', limit = '20' } = req.query as Record<string, string>;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const skip     = (pageNum - 1) * limitNum;
  const saleDate = date ? new Date(date) : new Date();

  const cacheKey = CacheKeys.auctionPrice(
    itemCode ?? 'all',
    marketCode ?? 'all',
    dayjs(saleDate).format('YYYYMMDD')
  );

  const cached = await getCache<unknown>(cacheKey);
  if (cached) { res.json(cached); return; }

  const where: Record<string, unknown> = {
    saleDate,
    ...(gradeCode && { gradeCode }),
    ...(itemCode && { item: { itemCode } }),
    ...(marketCode && { market: { code: marketCode } }),
  };

  const [items, total] = await Promise.all([
    prisma.auctionPrice.findMany({
      where,
      include: {
        market: { select: { id: true, name: true, region: true } },
        item:   { select: { id: true, itemCode: true, itemName: true, categoryCode: true } },
      },
      orderBy: { saleDate: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.auctionPrice.count({ where }),
  ]);

  const result = {
    items: items.map((p) => ({
      id:          p.id.toString(),
      marketId:    p.marketId,
      marketName:  p.market.name,
      marketRegion: p.market.region,
      itemId:      p.itemId,
      itemCode:    p.item.itemCode,
      itemName:    p.item.itemName,
      gradeCode:   p.gradeCode,
      saleDate:    dayjs(p.saleDate).format('YYYY-MM-DD'),
      avgPrice:    Number(p.avgPrice),
      maxPrice:    Number(p.maxPrice),
      minPrice:    Number(p.minPrice),
      totalQty:    Number(p.totalQty),
    })),
    total,
    page: pageNum,
    limit: limitNum,
  };

  await setCache(cacheKey, result, CacheTTL.AUCTION_PRICE);
  res.json(result);
}

// ===== 경락가격 이력 =====
export async function getAuctionHistory(req: Request, res: Response): Promise<void> {
    const itemCode = String(req.params.itemCode);
  const { marketCode, gradeCode, startDate, endDate } = req.query as Record<string, string>;

  const start = startDate ? new Date(startDate) : dayjs().subtract(30, 'day').toDate();
  const end   = endDate   ? new Date(endDate)   : new Date();

  const cacheKey = CacheKeys.auctionHistory(
    itemCode,
    dayjs(start).format('YYYYMMDD'),
    dayjs(end).format('YYYYMMDD')
  );

  const cached = await getCache<unknown>(cacheKey);
  if (cached) { res.json(cached); return; }

  const item = await prisma.item.findUnique({ where: { itemCode } });
  if (!item) { res.status(404).json({ error: 'ITEM_NOT_FOUND' }); return; }

  const history = await prisma.auctionPrice.findMany({
    where: {
      itemId: item.id,
      saleDate: { gte: start, lte: end },
      ...(gradeCode && { gradeCode }),
      ...(marketCode && { market: { code: marketCode } }),
    },
    orderBy: { saleDate: 'asc' },
    select: {
      saleDate:  true,
      avgPrice:  true,
      maxPrice:  true,
      minPrice:  true,
      totalQty:  true,
      gradeCode: true,
    },
  });

  const result = {
    history: history.map((h) => ({
      date:     dayjs(h.saleDate).format('YYYY-MM-DD'),
      avgPrice: Number(h.avgPrice),
      maxPrice: Number(h.maxPrice),
      minPrice: Number(h.minPrice),
      totalQty: Number(h.totalQty),
    })),
    averages: [], // TODO: 5년 평년 데이터
  };

  await setCache(cacheKey, result, CacheTTL.AUCTION_HISTORY);
  res.json(result);
}

// ===== 조사가격 (산지·도매·소매) =====
export async function getSurveyPrices(req: Request, res: Response): Promise<void> {
  const { itemCode, priceType, regionCode, date } = req.query as Record<string, string>;

  const surveyDate = date ? new Date(date) : new Date();
  const cacheKey   = CacheKeys.surveyPrice(
    itemCode ?? 'all',
    priceType ?? 'all',
    dayjs(surveyDate).format('YYYYMMDD')
  );

  const cached = await getCache<unknown>(cacheKey);
  if (cached) { res.json(cached); return; }

  const item = await prisma.item.findUnique({ where: { itemCode } });
  if (!item) { res.status(404).json({ error: 'ITEM_NOT_FOUND' }); return; }

  const prices = await prisma.surveyPrice.findMany({
    where: {
      itemId:     item.id,
      surveyDate: surveyDate,
      ...(priceType  && { priceType }),
      ...(regionCode && { regionCode }),
    },
  });

  const getPrice = (type: string) =>
    Number(prices.find((p) => p.priceType === type)?.price ?? null) || null;

  const origin    = getPrice('ORIGIN');
  const wholesale = getPrice('WHOLESALE');
  const retail    = getPrice('RETAIL');
  const marginRate =
    origin && retail ? ((retail - origin) / retail) * 100 : null;

  const result = { origin, wholesale, retail, marginRate };

  await setCache(cacheKey, result, CacheTTL.SURVEY_PRICE);
  res.json(result);
}

// ===== 시장별 가격 비교 =====
export async function compareMarketPrices(req: Request, res: Response): Promise<void> {
  const { itemCode, gradeCode, date } = req.query as Record<string, string>;
  const saleDate = date ? new Date(date) : new Date();

  const cacheKey = CacheKeys.marketCompare(
    itemCode ?? 'all',
    dayjs(saleDate).format('YYYYMMDD')
  );

  const cached = await getCache<unknown>(cacheKey);
  if (cached) { res.json(cached); return; }

  const item = await prisma.item.findUnique({ where: { itemCode } });
  if (!item) { res.status(404).json({ error: 'ITEM_NOT_FOUND' }); return; }

  const prices = await prisma.auctionPrice.findMany({
    where: {
      itemId:   item.id,
      saleDate: saleDate,
      ...(gradeCode && { gradeCode }),
    },
    include: {
      market: { select: { id: true, name: true, region: true } },
    },
    orderBy: { avgPrice: 'desc' },
  });

  const result = {
    markets: prices.map((p) => ({
      market:   p.market,
      avgPrice: Number(p.avgPrice),
      maxPrice: Number(p.maxPrice),
      minPrice: Number(p.minPrice),
      totalQty: Number(p.totalQty),
    })),
  };

  await setCache(cacheKey, result, CacheTTL.MARKET_COMPARE);
  res.json(result);
}
