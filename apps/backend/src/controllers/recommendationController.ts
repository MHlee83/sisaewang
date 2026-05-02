import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { getCache, setCache, CacheKeys, CacheTTL } from '../utils/redis';
import axios from 'axios';
import dayjs from 'dayjs';
import { logger } from '../utils/logger';

export async function getRecommendation(req: Request, res: Response): Promise<void> {
    const itemCode = String(req.params.itemCode);
  const targetDate   = (req.query.targetDate as string) ?? dayjs().format('YYYY-MM-DD');

  const cacheKey = CacheKeys.recommendation(itemCode, targetDate);
  const cached   = await getCache<unknown>(cacheKey);
  if (cached) { res.json(cached); return; }

  // DB에서 기존 추천 조회
  const item = await prisma.item.findUnique({ where: { itemCode } });
  if (!item) { res.status(404).json({ error: 'ITEM_NOT_FOUND' }); return; }

  const existing = await prisma.aiRecommendation.findUnique({
    where: { uq_ai_recommendation_item_date: { itemId: item.id, targetDate: new Date(targetDate) } },
  });

  if (existing) {
    const result = {
      itemCode,
      targetDate,
      recommendation: existing.recommendation,
      score:          Number(existing.score),
      expectedPrice:  Number(existing.expectedPrice),
      reasoning:      existing.reasoning,
    };
    await setCache(cacheKey, result, CacheTTL.RECOMMENDATION);
    res.json(result);
    return;
  }

  // AI 서비스에서 실시간 추천 요청
  try {
    const { data } = await axios.get(
      `${process.env.AI_SERVICE_URL}/recommendations/${itemCode}`,
      {
        params: { target_date: targetDate },
        headers: { Authorization: `Bearer ${process.env.AI_SERVICE_TOKEN}` },
        timeout: 10000,
      }
    );

    await setCache(cacheKey, data, CacheTTL.RECOMMENDATION);
    res.json(data);
  } catch (err) {
    logger.error('AI 서비스 요청 실패:', err);
    res.status(503).json({ error: 'AI_SERVICE_UNAVAILABLE', message: 'AI 추천 서비스를 일시적으로 이용할 수 없습니다.' });
  }
}
