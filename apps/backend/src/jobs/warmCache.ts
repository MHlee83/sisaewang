import dayjs from 'dayjs';
import { prisma } from '../utils/prisma';
import { setCache, CacheKeys, CacheTTL } from '../utils/redis';
import { logger } from '../utils/logger';

// 인기 품목 코드 (홈 화면 기본 노출)
const POPULAR_ITEM_CODES = ['111', '112', '151', '152', '211', '222', '511', '441', '421'];
const MAIN_MARKET_CODES  = ['110001', '110002', '210001'];

export async function warmCache(): Promise<void> {
  const today = dayjs().format('YYYYMMDD');
  logger.info('[warmCache] 캐시 워밍 시작');

  let count = 0;

  for (const itemCode of POPULAR_ITEM_CODES) {
    const item = await prisma.item.findUnique({ where: { itemCode } });
    if (!item) continue;

    for (const marketCode of MAIN_MARKET_CODES) {
      const market = await prisma.market.findUnique({ where: { code: marketCode } });
      if (!market) continue;

      // 경락가격 캐시
      const prices = await prisma.auctionPrice.findMany({
        where: {
          itemId:   item.id,
          marketId: market.id,
          saleDate: new Date(`${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}`),
        },
        include: {
          market: { select: { id: true, name: true, region: true } },
          item:   { select: { id: true, itemCode: true, itemName: true, categoryCode: true } },
        },
      });

      if (prices.length > 0) {
        const cacheKey = CacheKeys.auctionPrice(itemCode, marketCode, today);
        await setCache(cacheKey, { items: prices, total: prices.length, page: 1 }, CacheTTL.AUCTION_PRICE);
        count++;
      }
    }
  }

  // 품목 목록 캐시
  const categories = ['100', '200', '300', '400', '500'];
  for (const categoryCode of categories) {
    const items = await prisma.item.findMany({
      where: { isActive: true, categoryCode },
      orderBy: { itemCode: 'asc' },
    });
    const cacheKey = CacheKeys.itemList(categoryCode, 1);
    await setCache(cacheKey, { items, total: items.length, page: 1 }, CacheTTL.ITEM_LIST);
    count++;
  }

  logger.info(`[warmCache] 완료 — ${count}개 캐시 워밍`);
}
