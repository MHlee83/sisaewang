import axios from 'axios';
import dayjs from 'dayjs';
import { prisma } from '../utils/prisma';
import { invalidatePattern } from '../utils/redis';
import { logger } from '../utils/logger';

const AUCTION_API_URL = 'https://apis.data.go.kr/B552895/farmAuction/getAuctionResultList';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function collectAuctionPrices(targetDate?: string): Promise<void> {
  const today = targetDate ?? dayjs().format('YYYYMMDD');
  logger.info(`[collectAuction] 수집 날짜: ${today}`);

  const markets = await prisma.market.findMany({ where: { isActive: true } });
  logger.info(`[collectAuction] 대상 시장 수: ${markets.length}`);

  let totalInserted = 0;
  let totalError    = 0;

  for (const market of markets) {
    let page = 1;

    while (true) {
      try {
        const response = await axios.get(AUCTION_API_URL, {
          params: {
            serviceKey:   process.env.DATA_GO_KR_API_KEY,
            condSaleDate: today,
            condWhsalCd:  market.code,
            pageNo:       page,
            numOfRows:    100,
          },
          timeout: 15000,
        });

        const body  = response.data?.response?.body;
        const items = body?.items?.item;

        if (!items || items.length === 0) break;

        const itemList = Array.isArray(items) ? items : [items];

        for (const raw of itemList) {
          try {
            // 품목 찾기 또는 생성
            let item = await prisma.item.findUnique({
              where: { itemCode: raw.itemCode },
            });

            if (!item) {
              item = await prisma.item.create({
                data: {
                  categoryCode: raw.itemCode.slice(0, 1) + '00',
                  categoryName: '기타',
                  itemCode:     raw.itemCode,
                  itemName:     raw.itemNm,
                  kindCode:     raw.kindCode ?? null,
                  kindName:     raw.kindNm ?? null,
                  unitQty:      raw.unitQty ? parseFloat(raw.unitQty) : null,
                  unitName:     raw.unitNm ?? null,
                },
              });
            }

            // UPSERT 경락가격
            await prisma.auctionPrice.upsert({
              where: {
                uq_auction_market_item_grade_date: {
                  marketId:  market.id,
                  itemId:    item.id,
                  gradeCode: raw.gradeCode ?? '상',
                  saleDate:  new Date(`${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}`),
                },
              },
              update: {
                avgPrice: parseFloat(raw.dpr1 ?? '0'),
                maxPrice: parseFloat(raw.dpr2 ?? '0'),
                minPrice: parseFloat(raw.dpr3 ?? '0'),
                totalQty: parseFloat(raw.totalQty ?? '0'),
              },
              create: {
                marketId:  market.id,
                itemId:    item.id,
                gradeCode: raw.gradeCode ?? '상',
                saleDate:  new Date(`${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}`),
                avgPrice:  parseFloat(raw.dpr1 ?? '0'),
                maxPrice:  parseFloat(raw.dpr2 ?? '0'),
                minPrice:  parseFloat(raw.dpr3 ?? '0'),
                totalQty:  parseFloat(raw.totalQty ?? '0'),
              },
            });

            totalInserted++;
          } catch (itemErr) {
            totalError++;
            logger.warn(`품목 처리 오류: ${raw.itemCode} - ${(itemErr as Error).message}`);
          }
        }

        if (itemList.length < 100) break;
        page++;
        await sleep(200); // Rate limit 준수
      } catch (err) {
        logger.error(`시장 ${market.code} 수집 오류 (page ${page}):`, err);
        break;
      }
    }
  }

  // Redis 캐시 무효화
  await invalidatePattern('prices:auction:*');

  logger.info(
    `[collectAuction] 완료 — 삽입/업데이트: ${totalInserted}건, 오류: ${totalError}건`
  );
}
