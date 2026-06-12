import axios from 'axios';
import dayjs from 'dayjs';
import { prisma } from '../utils/prisma';
import { invalidatePattern } from '../utils/redis';
import { logger } from '../utils/logger';

const AUCTION_API_URL = 'https://apis.data.go.kr/B552845/katOrigin/trades';
const PAGE_SIZE = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TradeRow {
  gds_lclsf_cd: string; gds_lclsf_nm: string;
  gds_mclsf_cd: string; gds_mclsf_nm: string;
  grd_nm: string | null;
  unit_nm: string | null; unit_qty: string | null; unit_tot_qty: string | null;
  qty: string | null; scsbd_prc: string | null; totprc: string | null;
}

interface Agg {
  categoryCode: string; categoryName: string; itemCode: string; itemName: string;
  grade: string; sumTotPrc: number; sumQty: number; minPrice: number; maxPrice: number;
}

async function fetchPage(date: string, whsalCd: string, pageNo: number) {
  const params = new URLSearchParams({ serviceKey: process.env.DATA_GO_KR_API_KEY ?? '', pageNo: String(pageNo), numOfRows: String(PAGE_SIZE), returnType: 'json' });
  params.append('cond[trd_clcln_ymd::EQ]', date);
  params.append('cond[whsl_mrkt_cd::EQ]', whsalCd);
  const r = await axios.get(AUCTION_API_URL + '?' + params.toString(), { timeout: 20000 });
  return r.data?.response?.body;
}

export async function collectAuctionPrices(targetDate?: string, marketCode?: string): Promise<{ upserted: number; errors: number }> {
  const raw = targetDate ?? dayjs().format('YYYYMMDD');
  const date = raw.includes('-') ? raw : raw.slice(0, 4) + '-' + raw.slice(4, 6) + '-' + raw.slice(6, 8);
  logger.info(`[collectAuction] 수집 날짜: ${date}`);

  const markets = await prisma.market.findMany({ where: marketCode ? { isActive: true, code: marketCode } : { isActive: true } });
  logger.info(`[collectAuction] 대상 시장 수: ${markets.length}`);

  let totalUpserted = 0;
  let totalError = 0;

  for (const market of markets) {
    const agg = new Map<string, Agg>();
    let page = 1;
    let fetched = 0;

    try {
      while (true) {
        const body = await fetchPage(date, market.code, page);
        const itemsRaw = body?.items?.item;
        const totalCount = Number(body?.totalCount ?? 0);
        if (!itemsRaw) break;
        const rows: TradeRow[] = Array.isArray(itemsRaw) ? itemsRaw : [itemsRaw];

        for (const row of rows) {
          const unitQty = parseFloat(row.unit_qty ?? '0');
          const prc = parseFloat(row.scsbd_prc ?? '0');
          const totPrc = parseFloat(row.totprc ?? '0');
          if (!prc || !totPrc || !row.gds_mclsf_cd) continue;

          const isKg = (row.unit_nm ?? '').toLowerCase() === 'kg' && unitQty > 0;
          const perUnit = isKg ? prc / unitQty : prc;
          const qtyBase = isKg ? parseFloat(row.unit_tot_qty ?? '0') : parseFloat(row.qty ?? '0');
          if (!qtyBase) continue;

          const itemCode = row.gds_lclsf_cd + row.gds_mclsf_cd;
          const grade = (row.grd_nm ?? '\uBB34\uB4F1\uAE09').slice(0, 5);
          const key = itemCode + '|' + grade;
          const cur = agg.get(key);
          if (!cur) {
            agg.set(key, { categoryCode: row.gds_lclsf_cd, categoryName: (row.gds_lclsf_nm ?? '\uAE30\uD0C0').slice(0, 20), itemCode, itemName: (row.gds_mclsf_nm ?? '').slice(0, 30), grade, sumTotPrc: totPrc, sumQty: qtyBase, minPrice: perUnit, maxPrice: perUnit });
          } else {
            cur.sumTotPrc += totPrc;
            cur.sumQty += qtyBase;
            if (perUnit < cur.minPrice) cur.minPrice = perUnit;
            if (perUnit > cur.maxPrice) cur.maxPrice = perUnit;
          }
        }

        fetched += rows.length;
        if (rows.length < PAGE_SIZE || (totalCount > 0 && fetched >= totalCount)) break;
        page++;
        await sleep(150);
      }
    } catch (err) {
      totalError++;
      logger.error(`\uC2DC\uC7A5 ${market.code} \uC218\uC9D1 \uC624\uB958 (page ${page}): ${(err as Error).message}`);
      continue;
    }

    for (const a of agg.values()) {
      try {
        let item = await prisma.item.findUnique({ where: { itemCode: a.itemCode } });
        if (!item) {
          item = await prisma.item.create({ data: { categoryCode: a.categoryCode, categoryName: a.categoryName, itemCode: a.itemCode, itemName: a.itemName, unitName: 'kg' } });
        }
        const avgPrice = a.sumQty > 0 ? a.sumTotPrc / a.sumQty : 0;
        await prisma.auctionPrice.upsert({
          where: { uq_auction_market_item_grade_date: { marketId: market.id, itemId: item.id, gradeCode: a.grade, saleDate: new Date(date) } },
          update: { avgPrice, maxPrice: a.maxPrice, minPrice: a.minPrice, totalQty: a.sumQty },
          create: { marketId: market.id, itemId: item.id, gradeCode: a.grade, saleDate: new Date(date), avgPrice, maxPrice: a.maxPrice, minPrice: a.minPrice, totalQty: a.sumQty },
        });
        totalUpserted++;
      } catch (itemErr) {
        totalError++;
        logger.warn(`\uD488\uBAA9 \uCC98\uB9AC \uC624\uB958: ${a.itemCode} - ${(itemErr as Error).message}`);
      }
    }

    logger.info(`[collectAuction] ${market.name}(${market.code}) - \uC6D0\uCC9C ${fetched}\uAC74 -> \uC9D1\uACC4 ${agg.size}\uAC74`);
  }

  await invalidatePattern('prices:auction:*');
  logger.info(`[collectAuction] \uC644\uB8CC - \uC0BD\uC785/\uC5C5\uB370\uC774\uD2B8: ${totalUpserted}\uAC74, \uC624\uB958: ${totalError}\uAC74`);
  return { upserted: totalUpserted, errors: totalError };
}
