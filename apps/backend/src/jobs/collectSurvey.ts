import axios from 'axios';
import dayjs from 'dayjs';
import { prisma } from '../utils/prisma';
import { invalidatePattern } from '../utils/redis';
import { logger } from '../utils/logger';

const KAMIS_API_URL = 'https://www.kamis.or.kr/service/price/xml.do';

// KAMIS 가격 유형 코드
const PRICE_TYPE_MAP: Record<string, string> = {
  '1': 'ORIGIN',    // 산지
  '2': 'WHOLESALE', // 도매
  '3': 'RETAIL',    // 소매
  '4': 'RETAIL',    // 소매(할인점)
};

export async function collectSurveyPrices(targetDate?: string): Promise<void> {
  const today  = targetDate ? dayjs(targetDate) : dayjs();
  logger.info(`[collectSurvey] KAMIS 조사가격 수집 시작: ${today.format('YYYY-MM-DD')}`);

  // 수집 대상 품목 (KAMIS 품목 코드가 있는 것만)
  const items = await prisma.item.findMany({
    where: { isActive: true },
    select: { id: true, itemCode: true, itemName: true, categoryCode: true },
  });

  let totalInserted = 0;

  for (const item of items) {
    try {
      const response = await axios.get(KAMIS_API_URL, {
        params: {
          action:              'dailySalesList',
          p_yyyy:              today.format('YYYY'),
          p_mm:                today.format('MM'),
          p_dd:                today.format('DD'),
          p_itemcategorycode:  item.categoryCode,
          p_itemcode:          item.itemCode,
          p_cert_key:          process.env.KAMIS_API_KEY,
          p_returntype:        'json',
        },
        timeout: 15000,
      });

      const priceList = response.data?.data?.item;
      if (!priceList || !Array.isArray(priceList)) continue;

      for (const raw of priceList) {
        const priceType = PRICE_TYPE_MAP[raw.kindcode] ?? null;
        if (!priceType || !raw.price || raw.price === '-') continue;

        const price = parseFloat(raw.price.replace(/,/g, ''));
        if (isNaN(price) || price <= 0) continue;

        await prisma.surveyPrice.upsert({
          where: {
            uq_survey_item_type_region_date: {
              itemId:     item.id,
              priceType,
              regionCode: raw.countrycode ?? '1101',
              surveyDate: new Date(`${today.format('YYYY-MM-DD')}`),
            },
          },
          update: { price },
          create: {
            itemId:     item.id,
            priceType,
            regionCode: raw.countrycode ?? '1101',
            surveyDate: new Date(`${today.format('YYYY-MM-DD')}`),
            price,
          },
        });
        totalInserted++;
      }
    } catch (err) {
      logger.warn(`KAMIS 품목 ${item.itemCode} 수집 오류: ${(err as Error).message}`);
    }
  }

  await invalidatePattern('prices:survey:*');
  logger.info(`[collectSurvey] 완료 — 삽입/업데이트: ${totalInserted}건`);
}
