import Redis from 'ioredis';

// Redis가 없으면 no-op으로 동작 (베타 배포 시 Redis 없이도 실행 가능)
const REDIS_URL = process.env.REDIS_URL;

let _redis: Redis | null = null;

if (REDIS_URL) {
    _redis = new Redis(REDIS_URL, {
          maxRetriesPerRequest: 3,
          lazyConnect: false,
    });

  _redis.on('error', (err) => {
        console.error('[Redis] 연결 오류:', err.message);
  });
} else {
    console.warn('[Redis] REDIS_URL 미설정 — 캐시 비활성화 (no-op 모드)');
}

// Redis가 없을 때를 위한 mock 객체
const noopRedis = {
    ping: async () => 'PONG',
    get: async (_key: string) => null,
    setex: async () => 'OK',
    del: async () => 0,
    keys: async () => [] as string[],
};

export const redis = _redis ?? (noopRedis as unknown as Redis);
export const isRedisEnabled = !!_redis;

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
    AUCTION_PRICE:   30 * 60,
    AUCTION_HISTORY: 60 * 60,
    SURVEY_PRICE:    60 * 60,
    ITEM_LIST:       24 * 3600,
    RECOMMENDATION:  24 * 3600,
    MARKET_COMPARE:  30 * 60,
};

// ===== 캐시 유틸 =====
export async function getCache<T>(key: string): Promise<T | null> {
    if (!_redis) return null;
    const data = await redis.get(key);
    if (!data) return null;
    try {
          return JSON.parse(data) as T;
    } catch {
          return null;
    }
}

export async function setCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!_redis) return;
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
}

export async function invalidatePattern(pattern: string): Promise<void> {
    if (!_redis) return;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
          await redis.del(...keys);
    }
}
