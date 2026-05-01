import api from './api';
import type {
  AuctionPrice,
  DailyPrice,
  YearlyAverage,
  SurveyPriceResult,
  PaginatedResponse,
} from '@/types';

// ===== 경락가격 =====

export async function getAuctionPrices(params: {
  itemCode: string;
  marketCode?: string;
  date?: string;
  gradeCode?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<AuctionPrice>> {
  const { data } = await api.get('/prices/auction', { params });
  return data;
}

export async function getAuctionHistory(
  itemCode: string,
  params: {
    marketCode?: string;
    gradeCode?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ history: DailyPrice[]; averages: YearlyAverage[] }> {
  const { data } = await api.get(`/prices/auction/${itemCode}/history`, { params });
  return data;
}

// ===== 조사가격 (산지·도매·소매) =====

export async function getSurveyPrices(params: {
  itemCode: string;
  priceType?: string;
  regionCode?: string;
  date?: string;
}): Promise<SurveyPriceResult> {
  const { data } = await api.get('/prices/survey', { params });
  return data;
}

// ===== 시장별 가격 비교 =====

export async function compareMarketPrices(params: {
  itemCode: string;
  gradeCode?: string;
  date?: string;
}): Promise<{
  markets: Array<{
    market: { id: number; name: string; region: string };
    avgPrice: number;
    maxPrice: number;
    minPrice: number;
    totalQty: number;
  }>;
}> {
  const { data } = await api.get('/prices/compare', { params });
  return data;
}
