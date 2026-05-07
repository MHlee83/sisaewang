import axios from 'axios';
import dayjs from 'dayjs';
import { prisma } from '../utils/prisma';
import { invalidatePattern } from '../utils/redis';
import { logger } from '../utils/logger';

// 공영도매시장 실시간 경매정보 API (승인 완료)
const AUCTION_API_URL = 'https://apis.data.go.kr/B552845/katRealTime2/trades2';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function collectAuctionPrices(targetDate?: string): Promise<void> {
  // 새 API는 YYYY-MM-DD 형식 사용
  const today = targetDate
    ? `${targetDate.slice(0, 4)}-${targetDate.slice(4, 6)}-${targetDate.slice(6, 8)}`
    : dayjs().format('YYYY-MM-DD');
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
            serviceKey:                    process.env.AUCTION_API_KEY,
            'cond[trd_clcln_ymd::EQ]':     today,
            'cond[whsl_mrkt_cd::EQ]':       market.code,
            pageNo:                         page,
            numOfRows:                      100,
          },
          timeout: 15000,
        });

        const body  = response.data?.response?.body;
        const items = body?.items?.item;

        if (!items || (Array.isArray(items) && items.length === 0)) break;

        const itemList = Array.isArray(items) ? items : [items];

        const saleDateObj = new Date(today);

        for (const raw of itemList) {
          try {
            // 소분류 품목코드 사용 (gds_sclsf_cd)
            const itemCode = raw.gds_sclsf_cd ?? raw.gds_mclsf_cd ?? 'UNKNOWN';
            const itemName = raw.gds_sclsf_nm ?? raw.gds_mclsf_nm ?? '미분류';
            const catCode  = raw.gds_lclsf_cd ?? itemCode.slice(0, 2) + '00';
            const catName  = raw.gds_lclsf_nm ?? '기타';

            // 품목 찾기 또는 생성
            let item = await prisma.item.findUnique({
              where: { itemCode },
            });

            if (!item) {
              item = await prisma.item.create({
                data: {
                  categoryCode: catCode,
                  categoryName: catName,
                  itemCode,
                  itemName,
                  kindCode:  raw.gds_mclsf_cd ?? null,
                  kindName:  raw.gds_mclsf_nm ?? null,
                  unitQty:   raw.unit_qty  ? parseFloat(raw.unit_qty)  : null,
                  unitName:  raw.unit_cd   ?? raw.unit_nm ?? null,
                },
              });
            }

            // 낙찰가(scsbd_prc) 기준 UPSERT
            const price   = parseFloat(raw.scsbd_prc ?? '0');
            const qty     = parseFloat(raw.qty       ?? '0');
            const grade   = raw.grd_cd ?? raw.grd_nm ?? '상';

            await prisma.auctionPrice.upsert({
              where: {
                uq_auction_market_item_grade_date: {
                  marketId:  market.id,
                  itemId:    item.id,
                  gradeCode: grade,
                  saleDate:  saleDateObj,
                },
              },
              update: {
                avgPrice: price,
                maxPrice: price,
                minPrice: price,
                totalQty: qty,
              },
              create: {
                marketId:  market.id,
                itemId:    item.id,
                gradeCode: grade,
                saleDate:  saleDateObj,
                avgPrice:  price,
                maxPrice:  price,
                minPrice:  price,
                totalQty:  qty,
              },
            });

            totalInserted++;
          } catch (itemErr) {
            totalError++;
            logger.warn(`품목 처리 오류: ${raw.gds_sclsf_cd} - ${(itemErr as Error).message}`);
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
