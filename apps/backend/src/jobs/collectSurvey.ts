import axios from 'axios';
import dayjs from 'dayjs';
import { prisma } from '../utils/prisma';
import { invalidatePattern } from '../utils/redis';
import { logger } from '../utils/logger';

const KAMIS_API_URL = 'https://www.kamis.or.kr/service/price/xml.do';

// product_cls_code: '01'=소매, '02'=도매
const PRICE_TYPE_MAP: Record<string, string> = {
  '01': 'RETAIL',
  '02': 'WHOLESALE',
};

export async function collectSurveyPrices(targetDate?: string): Promise<void> {
  const today = targetDate ? dayjs(targetDate) : dayjs();
  logger.info(`[collectSurvey] KAMIS 조사가격 수집 시작: ${today.format('YYYY-MM-DD')}`);

  // 1. KAMIS API 1회 호출 (전체 품목 반환)
  let priceList: Record<string, unknown>[];
  try {
    const response = await axios.get(KAMIS_API_URL, {
      params: {
        action:       'dailySalesList',
        p_yyyy:       today.format('YYYY'),
        p_mm:         today.format('MM'),
        p_dd:         today.format('DD'),
        p_cert_key:   process.env.KAMIS_API_KEY,
        p_cert_id:    process.env.KAMIS_CERT_ID,
        p_returntype: 'json',
      },
      timeout: 30000,
    });

    const raw = response.data?.price;
    if (!raw || !Array.isArray(raw)) {
      logger.warn(`[collectSurvey] 응답에 price 배열 없음. error_code=${response.data?.error_code}`);
      return;
    }
    priceList = raw as Record<string, unknown>[];
    logger.info(`[collectSurvey] API 응답 항목 수: ${priceList.length}`);
  } catch (err) {
    logger.error(`[collectSurvey] KAMIS API 호출 오류: ${(err as Error).message}`);
    return;
  }

  // 2. DB 품목 목록 (카테고리 코드 + 이름 매칭용)
  const dbItems = await prisma.item.findMany({
    where: { isActive: true },
    select: { id: true, itemCode: true, itemName: true, categoryCode: true },
  });

  // 3. 가격 데이터 저장
  let totalInserted = 0;
  let totalSkipped  = 0;

  for (const raw of priceList) {
    const priceType = PRICE_TYPE_MAP[raw.product_cls_code as string];
    if (!priceType) { totalSkipped++; continue; }

    // dpr1 = 당일 가격
    const dpr1 = raw.dpr1 as string | undefined;
    if (!dpr1 || dpr1 === '-' || dpr1 === '' || Array.isArray(dpr1)) { totalSkipped++; continue; }

    const price = parseFloat(String(dpr1).replace(/,/g, '').trim());
    if (isNaN(price) || price <= 0) { totalSkipped++; continue; }

    // 품목명 앞부분(/ 이전)으로 DB 품목 매칭
    const rawName = ((raw.item_name as string) ?? '').split('/')[0].trim();
    const categoryCode = raw.category_code as string;

    const matched = dbItems.find(
      (item) => item.categoryCode === categoryCode && rawName === item.itemName,
    );
    if (!matched) { totalSkipped++; continue; }

    try {
      await prisma.surveyPrice.upsert({
        where: {
          uq_survey_item_type_region_date: {
            itemId:     matched.id,
            priceType,
            regionCode: '1101',
            surveyDate: new Date(today.format('YYYY-MM-DD')),
          },
        },
        update: { price },
        create: {
          itemId:     matched.id,
          priceType,
          regionCode: '1101',
          surveyDate: new Date(today.format('YYYY-MM-DD')),
          price,
        },
      });
      totalInserted++;
    } catch (e) {
      logger.warn(`[collectSurvey] upsert 오류 (${matched.itemName}/${priceType}): ${(e as Error).message}`);
    }
  }

  await invalidatePattern('prices:survey:*');
  logger.info(
    `[collectSurvey] 완료 — 저장: ${totalInserted}건, 스킵: ${totalSkipped}건`,
  );
}
