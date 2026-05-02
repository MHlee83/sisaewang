import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on('error', (err) => {
  console.error('[Redis] 연결 오류:', err.message);
});

// ===== 캐시 키 헬퍼 =====
export const CacheKeys = {
  auctionPrice: (itemCode: string, marketCode: string, date: string) =>
    `prices:auction:${itemCode}:${marketCode}:${date}`,

  auctionHistory: (itemCode: string, startDate: string, endDate: string) =>
    `prices:auction:${itemCode}:history:${startDate}:${endDate}`,

  surveyPrice: (itemCode: string, priceType: string, date: string) =>
    `prices:survey:${itemCode}:${priceType}:${date}`,

  itemList: (categoryCode: string, page: number) =>
    `items:list:${categoryCode}:${page}`,

  recommendation: (itemCode: string, date: string) =>
    `recommendations:${itemCode}:${date}`,

  marketCompare: (itemCode: string, date: string) =>
    `prices:compare:${itemCode}:${date}`,
};

// ===== TTL 상수 (초) =====
export const CacheTTL = {
  AUCTION_PRICE:   30 * 60,   // 30분
  AUCTION_HISTORY: 60 * 60,   // 1시간
  SURVEY_PRICE:    60 * 60,   // 1시간
  ITEM_LIST:       24 * 3600, // 24시간
  RECOMMENDATION:  24 * 3600, // 24시간
  MARKET_COMPARE:  30 * 60,   // 30분
};

// ===== 캐시 유틸 =====
export async function getCache<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}

export async function invalidatePattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
